import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.main import app, get_current_user, ALL_MODULE_IDS  # type: ignore
from app import db as DB
from app import models

admin_user = SimpleNamespace(
    id=1,
    username='tester',
    role='Admin',
    role_id=None,
    role_obj=None,
    full_name='Tester',
    mobile='09120000000',
)


@pytest.fixture(autouse=True, scope="module")
def override_admin_user():
    prev = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: admin_user
    yield
    if prev is not None:
        app.dependency_overrides[get_current_user] = prev
    else:
        app.dependency_overrides.pop(get_current_user, None)

TEST_ENGINE = DB.create_test_engine()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="module", autouse=True)
def setup_schema():
    DB.Base.metadata.drop_all(bind=TEST_ENGINE)
    DB.Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    DB.Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(autouse=True, scope="module")
def override_db_dependency():
    prev = app.dependency_overrides.get(DB.get_db)

    def _override_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[DB.get_db] = _override_db
    yield
    if prev is not None:
        app.dependency_overrides[DB.get_db] = prev
    else:
        app.dependency_overrides.pop(DB.get_db, None)


client = TestClient(app)


def _set_current_user(fake_user):
    app.dependency_overrides[get_current_user] = lambda: fake_user


@pytest.fixture(autouse=True)
def reset_db():
    with TEST_ENGINE.begin() as conn:
        for table in reversed(DB.Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture
def session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _make_invoice(session, *, server_time: datetime, total: int, status: str = 'final'):
    invoice = models.Invoice(
        invoice_number=f'INV-{uuid.uuid4().hex[:8]}',
        invoice_type='sale',
        mode='manual',
        status=status,
        server_time=server_time,
        total=total,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return invoice


def _make_payment(
    session,
    *,
    direction: str,
    amount: int,
    method: str,
    server_time: datetime,
    due_date: datetime | None = None,
    status: str = 'posted',
):
    payment = models.Payment(
        payment_number=f'PAY-{uuid.uuid4().hex[:8]}',
        direction=direction,
        mode='manual',
        amount=amount,
        method=method,
        status=status,
        server_time=server_time,
        due_date=due_date,
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


def _make_product(session, *, inventory: int):
    product = models.Product(
        id=f'PROD-{uuid.uuid4().hex[:8]}',
        name='Stale Inventory',
        name_norm='stale inventory',
        code=f'P-{uuid.uuid4().hex[:6]}',
        unit='pcs',
        inventory=inventory,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def test_dashboard_summary_counts_and_cash_balances(session):
    now = datetime.now(timezone.utc)
    _make_invoice(session, server_time=now, total=1_000_000)
    _make_invoice(session, server_time=now - timedelta(days=3), total=2_000_000)
    _make_invoice(session, server_time=now - timedelta(days=5), total=3_000_000)
    _make_payment(session, direction='in', amount=500_000, method='cash', server_time=now)
    _make_payment(session, direction='out', amount=200_000, method='bank', server_time=now)

    resp = client.get('/api/dashboard/summary')
    assert resp.status_code == 200
    data = resp.json()

    assert data['invoices']['today'] == 1
    assert data['invoices']['7days'] == 3
    assert data['receipts_today'] == 500_000
    assert data['payments_today'] == 200_000
    assert data['net_today'] == 300_000
    assert data['cash_balances']['cash'] == 500_000
    assert data['cash_balances']['bank'] == -200_000
    assert data['cash_balances']['pos'] == 0


def test_dashboard_sales_trend_series_matches_totals(session):
    now = datetime.now(timezone.utc)
    _make_invoice(session, server_time=now, total=900_000)
    _make_invoice(session, server_time=now - timedelta(days=1), total=100_000)

    resp = client.get('/api/dashboard/sales-trends?days=2')
    assert resp.status_code == 200
    payload = resp.json()

    assert payload['days'] == 2
    assert len(payload['series']) == 3
    total = sum(point['total'] for point in payload['series'])
    assert total == 1_000_000


def test_dashboard_old_stock_lists_stale_products(session):
    product = _make_product(session, inventory=12)

    resp = client.get('/api/dashboard/old-stock?days=30&min_qty=5')
    assert resp.status_code == 200
    payload = resp.json()

    assert isinstance(payload, list)
    assert any(item['product_id'] == product.id for item in payload)


def test_dashboard_checks_due_returns_upcoming_payments(session):
    now = datetime.now(timezone.utc)
    payment = _make_payment(
        session,
        direction='out',
        amount=750_000,
        method='bank',
        server_time=now,
        due_date=now + timedelta(days=5),
        status='draft',
    )

    resp = client.get('/api/dashboard/checks-due?within_days=7')
    assert resp.status_code == 200
    payload = resp.json()

    assert isinstance(payload, list)
    assert any(item['id'] == payment.id for item in payload)


def test_non_developer_modules_follow_role_permissions(session):
    suffix = uuid.uuid4().hex[:6]
    perm_sales = models.Permission(
        name=f'sales.read.{suffix}',
        description='Sales access',
        module='sales',
    )
    perm_people = models.Permission(
        name=f'people.read.{suffix}',
        description='People access',
        module='people',
    )
    role = models.Role(name=f'SalesTester{suffix}', description='Limited sales role')
    role.permissions = [perm_sales, perm_people]
    session.add_all([perm_sales, perm_people, role])
    session.commit()
    session.refresh(role)

    limited_user = SimpleNamespace(
        id=42,
        username='limited',
        role='Sales',
        role_id=role.id,
        role_obj=None,
        full_name='Limited User',
        mobile='09124444444',
    )

    _set_current_user(limited_user)
    try:
        resp = client.get('/api/current-user/modules')
        assert resp.status_code == 200
        modules = set(resp.json())
        assert modules == {'sales', 'people'}
    finally:
        _set_current_user(admin_user)


def test_developer_receives_full_module_list():
    dev_user = SimpleNamespace(
        id=7,
        username='developer',
        role='Developer',
        role_id=None,
        role_obj=None,
        full_name='Dev User',
        mobile='09123506545',
    )

    _set_current_user(dev_user)
    try:
        resp = client.get('/api/current-user/modules')
        assert resp.status_code == 200
        modules = set(resp.json())
        assert modules == set(ALL_MODULE_IDS)
    finally:
        _set_current_user(admin_user)
