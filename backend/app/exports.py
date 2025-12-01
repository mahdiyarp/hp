
import csv
import os
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
    from openpyxl import Workbook
except ImportError:  # pragma: no cover - optional dependency
    Workbook = None  # type: ignore

from . import models

EXPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


def _invoice_base_data(db_session, invoice_id: int):
    inv = db_session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    items = db_session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    return inv, items


def export_invoice_pdf(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError("invoice not found")
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(EXPORT_DIR, fn)
    if _REPORTLAB_AVAILABLE and canvas and A4:
        c = canvas.Canvas(path, pagesize=A4)
        width, height = A4
        margin = 20 * mm
        y = height - margin
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin, y, f"Invoice: {inv.invoice_number or ''}")
        y -= 10 * mm
        c.setFont("Helvetica", 11)
        c.drawString(margin, y, f"Customer: {inv.party_name or ''}")
        y -= 8 * mm
        c.drawString(margin, y, f"Date: {inv.server_time.isoformat() if inv.server_time else ''}")
        y -= 12 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Description")
        c.drawString(margin + 90 * mm, y, "Qty")
        c.drawString(margin + 120 * mm, y, "Unit price")
        c.drawString(margin + 160 * mm, y, "Total")
        y -= 6 * mm
        c.setFont("Helvetica", 10)
        total = 0
        for it in items:
            c.drawString(margin, y, (it.description or "")[:60])
            c.drawString(margin + 90 * mm, y, str(it.quantity))
            c.drawString(margin + 120 * mm, y, str(it.unit_price))
            c.drawString(margin + 160 * mm, y, str(it.total))
            y -= 6 * mm
            total += int(it.total or 0)
            if y < margin + 30 * mm:
                c.showPage()
                y = height - margin
        y -= 6 * mm
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, y, f"Grand Total: {total}")
        c.save()
    else:
        # Text fallback so API still works without optional dependency
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"Invoice {inv.invoice_number or inv.id}\n")
            f.write(f"Party: {inv.party_name}\n")
            f.write(f"Total: {inv.total}\n")
            for it in items:
                f.write(f"- {it.description}: qty {it.quantity} price {it.unit_price} total {it.total}\n")
    return path


def export_invoice_csv(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError("invoice not found")
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.csv"
    path = os.path.join(EXPORT_DIR, fn)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["invoice_number", inv.invoice_number or ""])
        writer.writerow(["party_name", inv.party_name or ""])
        writer.writerow([])
        writer.writerow(["description", "quantity", "unit", "unit_price", "total"])
        for it in items:
            writer.writerow([it.description or "", it.quantity, it.unit or "", it.unit_price, it.total])
    return path


def export_invoice_excel(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    if Workbook is None:
        raise RuntimeError("openpyxl dependency not installed; Excel export unavailable")
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError("invoice not found")
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.xlsx"
    path = os.path.join(EXPORT_DIR, fn)
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoice"
    ws.append(["invoice_number", inv.invoice_number or ""])
    ws.append(["party_name", inv.party_name or ""])
    ws.append([])
    ws.append(["description", "quantity", "unit", "unit_price", "total"])
    for it in items:
        ws.append([it.description or "", it.quantity, it.unit or "", it.unit_price, it.total])
    wb.save(path)
    return path


def export_invoice_json(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError("invoice not found")
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.json"
    path = os.path.join(EXPORT_DIR, fn)
    payload = {
        "invoice": {c.name: getattr(inv, c.name) for c in inv.__table__.columns},
        "items": [{c.name: getattr(it, c.name) for c in it.__table__.columns} for it in items],
    }
    with open(path, "w", encoding="utf-8") as f:
        import json as _json

        _json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
    return path


def export_invoice_xml(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError("invoice not found")
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}.xml"
    path = os.path.join(EXPORT_DIR, fn)
    lines = [f'<invoice id="{inv.id}" number="{inv.invoice_number or ""}" total="{inv.total or 0}">']
    lines.append(f"  <party>{inv.party_name or ''}</party>")
    lines.append(f"  <date>{inv.server_time.isoformat() if inv.server_time else ''}</date>")
    lines.append("  <items>")
    for it in items:
        lines.append(
            f'    <item description="{it.description or ""}" quantity="{it.quantity}" unit_price="{it.unit_price}" total="{it.total}" />'
        )
    lines.append("  </items>")
    lines.append("</invoice>")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def export_invoice_ubl_stub(db_session, invoice_id: int, filename: Optional[str] = None) -> str:
    data = _invoice_base_data(db_session, invoice_id)
    if not data:
        raise ValueError("invoice not found")
    inv, items = data
    fn = filename or f"invoice-{invoice_id}-{uuid.uuid4().hex[:8]}-ubl.xml"
    path = os.path.join(EXPORT_DIR, fn)
    lines = [
        '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">',
        f"  <cbc:ID>{inv.invoice_number or inv.id}</cbc:ID>",
        f"  <cbc:IssueDate>{inv.server_time.date().isoformat() if inv.server_time else ''}</cbc:IssueDate>",
        "  <cac:AccountingCustomerParty>",
        f"    <cbc:Name>{inv.party_name or ''}</cbc:Name>",
        "  </cac:AccountingCustomerParty>",
    ]
    for it in items:
        lines.append("  <cac:InvoiceLine>")
        lines.append(f"    <cbc:ID>{it.id}</cbc:ID>")
        lines.append(f"    <cbc:InvoicedQuantity>{it.quantity}</cbc:InvoicedQuantity>")
        lines.append(f"    <cbc:LineExtensionAmount>{it.total}</cbc:LineExtensionAmount>")
        lines.append(f"    <cbc:Item>{it.description}</cbc:Item>")
        lines.append("  </cac:InvoiceLine>")
    lines.append("</Invoice>")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path
