import os, sys, pytest, csv, secrets

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import models
    from app import security, crud
    from app.exports import export_sale_order_csv
except Exception:
    pytest.skip('backend deps not installed (skipping sale order export test)', allow_module_level=True)


@pytest.fixture(scope='module')
def session():
    engine = app_db.create_test_engine() if hasattr(app_db, 'create_test_engine') else None
    if engine is None:
        pytest.skip('no test engine helper available')
    s = app_db.create_test_session(engine)
    try:
        yield s
    finally:
        s.close()


def _ensure_admin_role(session):
    role = session.query(models.Role).filter(models.Role.name == 'Admin').first()
    if not role:
        role = models.Role(name='Admin', description='Administrator')
        session.add(role)
        session.commit()
        session.refresh(role)
    return role


def _create_admin_user(session):
    role = _ensure_admin_role(session)
    user = session.query(models.User).filter(models.User.username == 'export_admin').first()
    if not user:
        user = models.User(
            username='export_admin',
            hashed_password=security.get_password_hash('pass1234'),
            role_id=role.id,
            role='Admin',
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def _create_sale_order(session):
    so = models.SaleOrder(
        party_name='Test Customer',
        status='draft',
        subtotal=0,
        total=0,
    )
    session.add(so)
    session.commit()
    session.refresh(so)
    # add items
    item = models.SaleOrderItem(
        order_id=so.id,
        description='Item A',
        quantity=2,
        unit='pcs',
        unit_price=500,
        total=1000,
    )
    session.add(item)
    session.commit()
    # update totals
    so.subtotal = 1000
    so.total = 1000
    session.add(so)
    session.commit()
    session.refresh(so)
    return so


def test_sale_order_export_csv(session):
    user = _create_admin_user(session)
    so = _create_sale_order(session)
    path = export_sale_order_csv(session, so.id)
    assert os.path.exists(path)
    token = secrets.token_urlsafe(18)
    filename = os.path.basename(path)
    from datetime import datetime, timedelta, timezone
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    sf = crud.create_shared_file(session, token=token, file_path=path, filename=filename, created_by=user.id, expires_at=expires.isoformat())
    assert sf.token == token
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    assert any(r and r[0] == 'order_number' for r in rows[:1])  # header line
    assert any(r and 'Item A' in r for r in rows)
    assert any(r and 'Test Customer' in r for r in rows)
