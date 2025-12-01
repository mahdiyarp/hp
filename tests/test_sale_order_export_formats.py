import os, sys, pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import models
    from app import security
    from app.exports import export_sale_order_pdf, export_sale_order_excel
except Exception:
    pytest.skip('backend deps not installed (skipping sale order format tests)', allow_module_level=True)


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


def _create_order(session):
    so = models.SaleOrder(
        party_name='Format Customer',
        status='draft',
        subtotal=0,
        total=0,
    )
    session.add(so)
    session.commit()
    session.refresh(so)
    item = models.SaleOrderItem(
        order_id=so.id,
        description='Format Item',
        quantity=2,
        unit='pcs',
        unit_price=1000,
        total=2000,
    )
    session.add(item)
    session.commit()
    so.subtotal = 2000
    so.total = 2000
    session.add(so)
    session.commit()
    session.refresh(so)
    return so


def test_sale_order_pdf_export(session):
    # Skip if reportlab not available
    try:
        import reportlab  # noqa: F401
    except ImportError:
        pytest.skip('reportlab not installed')
    so = _create_order(session)
    path = export_sale_order_pdf(session, so.id)
    assert os.path.exists(path)
    assert path.endswith('.pdf')


def test_sale_order_excel_export(session):
    # Skip if openpyxl not available
    try:
        import openpyxl  # noqa: F401
    except ImportError:
        pytest.skip('openpyxl not installed')
    so = _create_order(session)
    path = export_sale_order_excel(session, so.id)
    assert os.path.exists(path)
    assert path.endswith('.xlsx')