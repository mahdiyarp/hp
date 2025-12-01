import os
import csv
import uuid
from datetime import datetime, timezone
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
from . import crud

EXPORT_DIR = os.path.join(os.path.dirname(__file__), '..', 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)


def _invoice_base_data(db_session, invoice_id: int):
    inv = db_session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    items = db_session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    return inv, items


def _sale_order_base_data(db_session, order_id: int):
    so = db_session.query(models.SaleOrder).filter(models.SaleOrder.id == order_id).first()
    if not so:
        return None
    items = db_session.query(models.SaleOrderItem).filter(models.SaleOrderItem.order_id == so.id).all()
    return so, items


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
    return path


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


def export_sale_order_csv(db_session, order_id: int, filename: Optional[str] = None) -> str:
    data = _sale_order_base_data(db_session, order_id)
    if not data:
        raise ValueError('sale order not found')
    so, items = data
    fn = filename or f"sale-order-{order_id}-{uuid.uuid4().hex[:8]}.csv"
    path = os.path.join(EXPORT_DIR, fn)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['order_number', so.order_number or ''])
        writer.writerow(['party_name', so.party_name or ''])
        writer.writerow(['status', so.status])
        writer.writerow(['total', so.total or 0])
        writer.writerow([])
        writer.writerow(['description', 'quantity', 'unit', 'unit_price', 'discount', 'tax_rate', 'total'])
        for it in items:
            writer.writerow([
                it.description or '',
                it.quantity,
                it.unit or '',
                it.unit_price,
                it.discount or '',
                it.tax_rate or '',
                it.total,
            ])
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


def export_sale_order_pdf(db_session, order_id: int, filename: Optional[str] = None) -> str:
    """Generate a simple PDF for a sale order (optional dependency)."""
    if not _REPORTLAB_AVAILABLE:
        raise RuntimeError('reportlab dependency not installed; PDF export unavailable')
    data = _sale_order_base_data(db_session, order_id)
    if not data:
        raise ValueError('sale order not found')
    so, items = data
    fn = filename or f"sale-order-{order_id}-{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(EXPORT_DIR, fn)
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    y = height - margin
    c.setFont('Helvetica-Bold', 14)
    c.drawString(margin, y, f"سفارش فروش: {so.order_number or ''}")
    y -= 10 * mm
    c.setFont('Helvetica', 11)
    c.drawString(margin, y, f"طرف حساب: {so.party_name or ''}")
    y -= 8 * mm
    c.drawString(margin, y, f"وضعیت: {so.status}")
    y -= 8 * mm
    c.drawString(margin, y, f"مبلغ کل: {so.total or 0}")
    y -= 12 * mm
    c.setFont('Helvetica-Bold', 10)
    c.drawString(margin, y, 'شرح')
    c.drawString(margin + 80 * mm, y, 'تعداد')
    c.drawString(margin + 105 * mm, y, 'قیمت واحد')
    c.drawString(margin + 140 * mm, y, 'جمع')
    y -= 6 * mm
    c.setFont('Helvetica', 10)
    for it in items:
        c.drawString(margin, y, (it.description or '')[:60])
        c.drawString(margin + 80 * mm, y, str(it.quantity))
        c.drawString(margin + 105 * mm, y, str(it.unit_price))
        c.drawString(margin + 140 * mm, y, str(it.total))
        y -= 6 * mm
        if y < margin + 30 * mm:
            c.showPage()
            y = height - margin
            c.setFont('Helvetica-Bold', 10)
            c.drawString(margin, y, 'شرح')
            c.drawString(margin + 80 * mm, y, 'تعداد')
            c.drawString(margin + 105 * mm, y, 'قیمت واحد')
            c.drawString(margin + 140 * mm, y, 'جمع')
            y -= 6 * mm
            c.setFont('Helvetica', 10)
    c.save()
    return path


def export_sale_order_excel(db_session, order_id: int, filename: Optional[str] = None) -> str:
    """Generate an Excel workbook for a sale order (optional dependency)."""
    if Workbook is None:
        raise RuntimeError('openpyxl dependency not installed; Excel export unavailable')
    data = _sale_order_base_data(db_session, order_id)
    if not data:
        raise ValueError('sale order not found')
    so, items = data
    fn = filename or f"sale-order-{order_id}-{uuid.uuid4().hex[:8]}.xlsx"
    path = os.path.join(EXPORT_DIR, fn)
    wb = Workbook()
    ws = wb.active
    ws.title = 'SaleOrder'
    ws.append(['order_number', so.order_number or ''])
    ws.append(['party_name', so.party_name or ''])
    ws.append(['status', so.status])
    ws.append(['total', so.total or 0])
    ws.append([])
    ws.append(['description', 'quantity', 'unit', 'unit_price', 'discount', 'tax_rate', 'total'])
    for it in items:
        ws.append([
            it.description or '',
            it.quantity,
            it.unit or '',
            it.unit_price,
            it.discount or '',
            it.tax_rate or '',
            it.total,
        ])
    wb.save(path)
    return path


def share_exported_file(db_session, user_id: int, path: str, expires_hours: int = 24) -> dict:
    """Create a shared download token for an exported file and return link metadata."""
    import secrets, os
    from datetime import datetime, timedelta
    token = secrets.token_urlsafe(18)
    filename = os.path.basename(path)
    expires = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    sf = crud.create_shared_file(db_session, token=token, file_path=path, filename=filename, created_by=user_id, expires_at=expires.isoformat())
    return {
        'token': token,
        'download_url': f"/api/exports/shared/{token}",
        'expires_at': sf.expires_at,
    }


def prune_expired_shared_files(db_session, remove_files: bool = True) -> int:
    """Delete expired shared file records and optionally remove their files from disk.
    Returns number of records deleted.
    """
    from datetime import datetime
    now = datetime.now(timezone.utc)
    expired = db_session.query(models.SharedFile).filter(models.SharedFile.expires_at != None, models.SharedFile.expires_at < now).all()  # noqa: E711
    count = 0
    from contextlib import suppress
    for sf in expired:
        if remove_files and sf.file_path and os.path.exists(sf.file_path):
            with suppress(Exception):
                os.remove(sf.file_path)
        with suppress(Exception):
            db_session.delete(sf)
            count += 1
    if count:
        try:
            db_session.commit()
        except Exception:
            db_session.rollback()
    return count
