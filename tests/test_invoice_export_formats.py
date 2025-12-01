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
    assert path is not None, "export_invoice_pdf should return a file path"
    assert os.path.exists(path), f"Expected file to exist at {path}"
    assert path.endswith('.pdf')


def test_invoice_excel_export(session):
    try:
        import openpyxl  # noqa: F401
    except ImportError:
        pytest.skip('openpyxl not installed')
    # Use unique invoice number to avoid UNIQUE constraint violation
    inv2 = models.Invoice(
        invoice_number='FMT-INV-XLS',
        invoice_type='sale',
        mode='manual',
        party_name='Excel Export Customer',
        status='draft',
        subtotal=0,
        total=0,
    )
    session.add(inv2)
    session.commit()
    session.refresh(inv2)
    item2 = models.InvoiceItem(
        invoice_id=inv2.id,
        description='Excel Export Item',
        quantity=2,
        unit='pcs',
        unit_price=777,
        total=1554,
    )
    session.add(item2)
    session.commit()
    inv2.subtotal = 1554
    inv2.total = 1554
    session.add(inv2)
    session.commit()
    session.refresh(inv2)
    
    path = export_invoice_excel(session, inv2.id)
    assert path is not None, "export_invoice_excel should return a file path"
    assert os.path.exists(path), f"Expected file to exist at {path}"
    assert path.endswith('.xlsx')