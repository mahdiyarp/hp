import os, sys, pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import models
    from app import security
    from app.exports import export_invoice_pdf, export_invoice_excel
except Exception:
    pytest.skip('backend deps not installed (skipping invoice format tests)', allow_module_level=True)


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


def _create_invoice(session):
    inv = models.Invoice(
        invoice_number='FMT-INV',
        invoice_type='sale',
        mode='manual',
        party_name='Format Invoice Customer',
        status='draft',
        subtotal=0,
        total=0,
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)
    item = models.InvoiceItem(
        invoice_id=inv.id,
        description='Format Invoice Item',
        quantity=1,
        unit='pcs',
        unit_price=555,
        total=555,
    )
    session.add(item)
    session.commit()
    inv.subtotal = 555
    inv.total = 555
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return inv


def test_invoice_pdf_export(session):
    try:
        import reportlab  # noqa: F401
    except ImportError:
        pytest.skip('reportlab not installed')
    inv = _create_invoice(session)
    path = export_invoice_pdf(session, inv.id)
    assert os.path.exists(path)
    assert path.endswith('.pdf')


def test_invoice_excel_export(session):
    try:
        import openpyxl  # noqa: F401
    except ImportError:
        pytest.skip('openpyxl not installed')
    inv = _create_invoice(session)
    path = export_invoice_excel(session, inv.id)
    assert os.path.exists(path)
    assert path.endswith('.xlsx')