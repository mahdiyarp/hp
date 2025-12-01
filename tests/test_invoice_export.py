import os, sys, pytest, csv, secrets

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import models
    from app import security, crud
    from app.exports import export_invoice_csv
except Exception:
    pytest.skip('backend deps not installed (skipping invoice export test)', allow_module_level=True)


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


def _ensure_admin_user(session):
    role = session.query(models.Role).filter(models.Role.name == 'Admin').first()
    if not role:
        role = models.Role(name='Admin', description='Administrator')
        session.add(role)
        session.commit()
        session.refresh(role)
    user = session.query(models.User).filter(models.User.username == 'invoice_export_admin').first()
    if not user:
        user = models.User(
            username='invoice_export_admin',
            hashed_password=security.get_password_hash('pass1234'),
            role_id=role.id,
            role='Admin',
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def _create_invoice(session):
    inv = models.Invoice(
        invoice_number='INV-TEST',
        invoice_type='sale',
        mode='manual',
        party_name='Invoice Customer',
        status='draft',
        subtotal=0,
        total=0,
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)
    item = models.InvoiceItem(
        invoice_id=inv.id,
        description='Invoice Item A',
        quantity=3,
        unit='pcs',
        unit_price=700,
        total=2100,
    )
    session.add(item)
    session.commit()
    # update invoice totals
    inv.subtotal = 2100
    inv.total = 2100
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return inv


def test_invoice_export_csv(session):
    user = _ensure_admin_user(session)
    inv = _create_invoice(session)
    path = export_invoice_csv(session, inv.id)
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
    assert rows[0][0] == 'invoice_number'
    assert any(r and 'Invoice Item A' in r for r in rows)
    assert any(r and 'Invoice Customer' in r for r in rows)