import os
import sys
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

# Ensure test DB is a file sqlite shared with the app
test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hp_test.db'))
os.environ.setdefault('DATABASE_URL', f'sqlite:///{test_db_path}')

backend_pkg_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_pkg_root not in sys.path:
    sys.path.insert(0, backend_pkg_root)

from app.main import app, get_current_user  # type: ignore
from app import db as DB
from app import models

# Create tables (idempotent)
DB.Base.metadata.create_all(bind=DB.engine)

# Override auth dependency with admin-like user
fake_perm = models.Permission(id=0, name='finance_report', description='Finance', module='finance')
fake_role = models.Role(id=1, name='Admin', description='Admin')
fake_role.permissions = [fake_perm]
fake_user = SimpleNamespace(id=1, username='tester', role='Admin', role_id=1, is_active=True, role_obj=fake_role)


@pytest.fixture(autouse=True, scope="module")
def override_user_dependency():
    prev = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: fake_user
    yield
    if prev is not None:
        app.dependency_overrides[get_current_user] = prev
    else:
        app.dependency_overrides.pop(get_current_user, None)

client = TestClient(app)


def seed_fifo_lifo_scenario():
    # Seed a simple product and three invoices: two purchases, one sale
    session = DB.SessionLocal()
    try:
        # Clean previous rows if exists (best-effort for sqlite persistence across runs)
        session.query(models.InvoiceItem).delete()
        session.query(models.Invoice).delete()
        session.query(models.Product).delete()
        session.commit()

        prod = models.Product(
            id='TESTPROD1',
            name='کالای تستی',
            name_norm='kalaye testi',
            code='P-TEST-001',
            unit='عدد',
            group='آزمایشی',
            description=None,
            inventory=0,
        )
        session.add(prod)
        session.commit()

        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        t1 = now - timedelta(days=10)
        t2 = now - timedelta(days=5)
        t3 = now - timedelta(days=2)

        # Purchase 1: 10 units @ 100
        inv_p1 = models.Invoice(invoice_type='purchase', mode='manual', party_name='تأمین‌کننده', server_time=t1, status='final', subtotal=1000, total=1000)
        session.add(inv_p1)
        session.flush()
        it_p1 = models.InvoiceItem(invoice_id=inv_p1.id, product_id=prod.id, description='خرید ۱', quantity=10, unit='عدد', unit_price=100, total=1000)
        session.add(it_p1)

        # Purchase 2: 10 units @ 200
        inv_p2 = models.Invoice(invoice_type='purchase', mode='manual', party_name='تأمین‌کننده', server_time=t2, status='final', subtotal=2000, total=2000)
        session.add(inv_p2)
        session.flush()
        it_p2 = models.InvoiceItem(invoice_id=inv_p2.id, product_id=prod.id, description='خرید ۲', quantity=10, unit='عدد', unit_price=200, total=2000)
        session.add(it_p2)

        # Sale: 10 units @ 300
        inv_s = models.Invoice(invoice_type='sale', mode='manual', party_name='مشتری', server_time=t3, status='final', subtotal=3000, total=3000)
        session.add(inv_s)
        session.flush()
        it_s = models.InvoiceItem(invoice_id=inv_s.id, product_id=prod.id, description='فروش', quantity=10, unit='عدد', unit_price=300, total=3000)
        session.add(it_s)

        session.commit()
        return {
            'start': (now - timedelta(days=15)).date().isoformat(),
            'end': (now - timedelta(days=1)).date().isoformat(),
        }
    finally:
        session.close()


def test_pnl_fifo_lifo_cogs_difference():
    rng = seed_fifo_lifo_scenario()
    # FIFO should take first layer (10 @ 100) => COGS = 1000
    r_fifo = client.get(f"/api/reports/pnl?start={rng['start']}&end={rng['end']}&method=FIFO")
    assert r_fifo.status_code == 200
    d_fifo = r_fifo.json()
    assert d_fifo.get('sales') == 3000
    assert d_fifo.get('cogs') in (1000, 1000.0)

    # LIFO should take last layer (10 @ 200) => COGS = 2000
    r_lifo = client.get(f"/api/reports/pnl?start={rng['start']}&end={rng['end']}&method=LIFO")
    assert r_lifo.status_code == 200
    d_lifo = r_lifo.json()
    assert d_lifo.get('sales') == 3000
    assert d_lifo.get('cogs') in (2000, 2000.0)

    # Gross profit should differ accordingly
    assert d_fifo.get('gross_profit') == 2000
    assert d_lifo.get('gross_profit') == 1000


def seed_partial_layers_scenario():
    session = DB.SessionLocal()
    try:
        session.query(models.InvoiceItem).delete()
        session.query(models.Invoice).delete()
        session.query(models.Product).delete()
        session.commit()

        prod = models.Product(
            id='LAYERS1', name='کالا لایه‌ای', name_norm='kala layeri', code='P-LYR-001', unit='عدد',
            group='آزمایشی', description=None, inventory=0,
        )
        session.add(prod)
        session.commit()

        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        t1 = now - timedelta(days=20)
        t2 = now - timedelta(days=15)
        t3 = now - timedelta(days=10)
        t4 = now - timedelta(days=5)

        # Purchases: 5 @100, 10 @200
        inv_p1 = models.Invoice(invoice_type='purchase', mode='manual', party_name='تأمین‌کننده', server_time=t1, status='final', subtotal=500, total=500)
        session.add(inv_p1); session.flush()
        session.add(models.InvoiceItem(invoice_id=inv_p1.id, product_id=prod.id, description='خرید ۱', quantity=5, unit='عدد', unit_price=100, total=500))

        inv_p2 = models.Invoice(invoice_type='purchase', mode='manual', party_name='تأمین‌کننده', server_time=t2, status='final', subtotal=2000, total=2000)
        session.add(inv_p2); session.flush()
        session.add(models.InvoiceItem(invoice_id=inv_p2.id, product_id=prod.id, description='خرید ۲', quantity=10, unit='عدد', unit_price=200, total=2000))

        # Sales: 8 units then 4 units @ 300
        inv_s1 = models.Invoice(invoice_type='sale', mode='manual', party_name='مشتری', server_time=t3, status='final', subtotal=2400, total=2400)
        session.add(inv_s1); session.flush()
        session.add(models.InvoiceItem(invoice_id=inv_s1.id, product_id=prod.id, description='فروش ۱', quantity=8, unit='عدد', unit_price=300, total=2400))

        inv_s2 = models.Invoice(invoice_type='sale', mode='manual', party_name='مشتری', server_time=t4, status='final', subtotal=1200, total=1200)
        session.add(inv_s2); session.flush()
        session.add(models.InvoiceItem(invoice_id=inv_s2.id, product_id=prod.id, description='فروش ۲', quantity=4, unit='عدد', unit_price=300, total=1200))

        session.commit()
        return {
            'start': (now - timedelta(days=30)).date().isoformat(),
            'end': (now - timedelta(days=1)).date().isoformat(),
        }
    finally:
        session.close()


def test_pnl_fifo_lifo_partial_layers():
    rng = seed_partial_layers_scenario()
    # Total sales = 2400 + 1200 = 3600
    r_fifo = client.get(f"/api/reports/pnl?start={rng['start']}&end={rng['end']}&method=FIFO")
    r_lifo = client.get(f"/api/reports/pnl?start={rng['start']}&end={rng['end']}&method=LIFO")
    assert r_fifo.status_code == 200 and r_lifo.status_code == 200
    d_fifo = r_fifo.json(); d_lifo = r_lifo.json()
    assert d_fifo.get('sales') == 3600 and d_lifo.get('sales') == 3600
    # FIFO COGS: first sale 8 => 5@100 + 3@200 = 1100; second sale 4 => 4@200 = 800; total 1900
    assert d_fifo.get('cogs') in (1900, 1900.0)
    # LIFO COGS: first sale 8 => 8@200 = 1600; second sale 4 => remaining 2@200 + 2@100 = 400+200 = 600; total 2200
    assert d_lifo.get('cogs') in (2200, 2200.0)
