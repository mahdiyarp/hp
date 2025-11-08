import re
from typing import Optional, Dict, Any
from . import db, models, crud
from datetime import datetime

# Very small rule-based Persian assistant. This is an MVP that supports a couple of commands:
# - "فاکتور فروش برای {party} ثبت کن با {n} {product}"  -> creates a sale invoice with n items (simple)
# - "گزارش دریافتی‌های امروز" -> returns total receipts today
# - other queries return a help message or a summary using existing report helpers


def _parse_create_invoice(text: str) -> Optional[Dict[str, Any]]:
    # matches patterns like: فاکتور فروش برای علی ثبت کن با سه عدد لپ‌تاپ HP
    # Simplify: look for 'فاکتور' and 'فروش' and 'برای <name>' and 'با <number> <product>'
    if 'فاکتور' in text and 'فروش' in text:
        m_for = re.search(r'برای\s+([\u0600-\u06FF\w\s\-]+)', text)
        m_items = re.search(r'با\s+(\d+)\s+([\u0600-\u06FF\w\s\-]+)', text)
        if m_for and m_items:
            party = m_for.group(1).strip()
            qty = int(m_items.group(1))
            product = m_items.group(2).strip()
            return {'invoice_type': 'sale', 'party_name': party, 'items': [{'description': product, 'quantity': qty, 'unit_price': 0}]}
    return None


def _parse_receipts_today(text: str) -> bool:
    # simple keyword detection
    if 'دریافت' in text or 'دریافتی' in text or 'رسید' in text:
        if 'امروز' in text:
            return True
    return False


def run_assistant(db_session, user, text: str) -> Dict[str, Any]:
    # Check if user has assistant enabled
    try:
        if not getattr(user, 'assistant_enabled', False):
            return {'ok': False, 'message': 'دستیار غیرفعال است. برای فعال‌سازی به تنظیمات کاربری مراجعه کنید.'}
    except Exception:
        pass
    # parse create invoice
    ci = _parse_create_invoice(text)
    if ci:
        # try to find person by name, if existing use id, else create a Person
        party_name = ci.get('party_name')
        p = None
        try:
            persons = crud.get_persons(db_session, q=party_name, limit=5)
            # match exact name if possible
            for pp in persons:
                if pp.name == party_name:
                    p = pp
                    break
            if not p and persons:
                p = persons[0]
        except Exception:
            p = None
        if not p:
            # create person
            from .schemas import PersonCreate
            pc = PersonCreate(name=party_name)
            try:
                p = crud.create_person(db_session, pc)
            except Exception:
                p = None
        # create invoice with items
        items = ci.get('items', [])
        from .schemas import InvoiceCreate, InvoiceItemCreate
        inv_items = []
        for it in items:
            ii = InvoiceItemCreate(description=it['description'], quantity=it.get('quantity', 1), unit=it.get('unit'), unit_price=it.get('unit_price', 0))
            inv_items.append(ii)
        inv_payload = InvoiceCreate(invoice_type='sale', party_id=(p.id if p else None), party_name=(p.name if p else party_name), items=inv_items)
        try:
            inv = crud.create_invoice_manual(db_session, inv_payload)
            return {'ok': True, 'message': f"فاکتور فروش برای {inv.party_name} با شماره {inv.invoice_number} ایجاد شد.", 'invoice_id': inv.id}
        except Exception as e:
            return {'ok': False, 'message': 'خطا در ایجاد فاکتور: ' + str(e)}
    # parse receipts today
    if _parse_receipts_today(text):
        # use report_cash or payments listing
        try:
            # sum of receipts today
            from datetime import datetime, timezone
            now = datetime.now()
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            pays = crud.get_payments(db_session, q=None, limit=1000)
            total = 0
            for p in pays:
                if p.direction == 'in' and p.server_time and p.server_time.date() == start.date():
                    total += int(p.amount or 0)
            return {'ok': True, 'message': f"جمع دریافتی‌های امروز: {total} ریال", 'total': total}
        except Exception as e:
            return {'ok': False, 'message': 'خطا در آماده‌سازی گزارش: ' + str(e)}
    # fallback: return help and suggestions
    help_text = 'من می‌توانم دستورات سادهٔ حسابداری را اجرا کنم، مثلاً:\n- "فاکتور فروش برای علی ثبت کن با 3 لپ‌تاپ HP"\n- "گزارش دریافتی‌های امروز"\nبرای فعال‌سازی یا خاموش کردن دستیار به /api/assistant/toggle مراجعه کنید.'
    return {'ok': True, 'message': help_text}

*** End Patch