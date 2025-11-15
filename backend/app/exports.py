import os
import csv
import uuid
from datetime import datetime
from typing import Optional

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    _REPORTLAB_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    A4 = canvas = None  # type: ignore
    mm = 1  # dummy value; function will guard availability
    _REPORTLAB_AVAILABLE = False

try:
    import pandas as pd  # noqa: F401
except ImportError:  # pragma: no cover - optional dependency
    pd = None  # type: ignore

try:
    from openpyxl import Workbook
except ImportError:  # pragma: no cover - optional dependency
    Workbook = None  # type: ignore

from . import db
from . import models

EXPORT_DIR = os.path.join(os.path.dirname(__file__), '..', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)


def _invoice_base_data(db_session, invoice_id: int):
    inv = db_session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    items = db_session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    return inv, items


def export_invoice_pdf(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    if not _REPORTLAB_AVAILABLE:
        raise RuntimeError('reportlab dependency not installed; PDF export unavailable')
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError('invoice not found')
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(EXPORT_DIR, fn)
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    y = height - margin
    # header
    c.setFont('Helvetica-Bold', 14)
    c.drawString(margin, y, f"فاکتور: {inv.invoice_number or ''}")
    y -= 10 * mm
    c.setFont('Helvetica', 11)
    c.drawString(margin, y, f"طرف حساب: {inv.party_name or ''}")
    y -= 8 * mm
    c.drawString(margin, y, f"تاریخ: {inv.server_time.isoformat() if inv.server_time else ''}")
    y -= 12 * mm
    # table header
    c.setFont('Helvetica-Bold', 10)
    c.drawString(margin, y, "شرح")
    c.drawString(margin + 90 * mm, y, "تعداد")
    c.drawString(margin + 120 * mm, y, "قیمت واحد")
    c.drawString(margin + 160 * mm, y, "جمع")
    y -= 6 * mm
    c.setFont('Helvetica', 10)
    total = 0
    for it in items:
        c.drawString(margin, y, (it.description or '')[:60])
        c.drawString(margin + 90 * mm, y, str(it.quantity))
        c.drawString(margin + 120 * mm, y, str(it.unit_price))
        c.drawString(margin + 160 * mm, y, str(it.total))
        y -= 6 * mm
        total += int(it.total or 0)
        if y < margin + 30 * mm:
            c.showPage()
            y = height - margin
    y -= 6 * mm
    c.setFont('Helvetica-Bold', 12)
    c.drawString(margin, y, f"مبلغ کل: {total}")
    c.save()



def export_invoice_csv(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError('invoice not found')
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.csv"
    path = os.path.join(EXPORT_DIR, fn)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['invoice_number', inv.invoice_number or ''])
        writer.writerow(['party_name', inv.party_name or ''])
        writer.writerow([])
        writer.writerow(['description', 'quantity', 'unit', 'unit_price', 'total'])
        for it in items:
            writer.writerow([it.description or '', it.quantity, it.unit or '', it.unit_price, it.total])
    return path


def export_invoice_excel(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    if Workbook is None:
        raise RuntimeError('openpyxl dependency not installed; Excel export unavailable')
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError('invoice not found')
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.xlsx"
    path = os.path.join(EXPORT_DIR, fn)
    wb = Workbook()
    ws = wb.active
    ws.title = 'Invoice'
    ws.append(['invoice_number', inv.invoice_number or ''])
    ws.append(['party_name', inv.party_name or ''])
    ws.append([])
    ws.append(['description', 'quantity', 'unit', 'unit_price', 'total'])
    for it in items:
        ws.append([it.description or '', it.quantity, it.unit or '', it.unit_price, it.total])
    wb.save(path)
    return path
