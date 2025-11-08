import os
import re
from typing import Dict, Any, List

try:
    import pytesseract
    from PIL import Image
    from pdf2image import convert_from_path
except Exception:
    pytesseract = None


def _image_to_text(path: str) -> str:
    if pytesseract is None:
        raise RuntimeError('pytesseract or dependencies not installed')
    img = Image.open(path)
    text = pytesseract.image_to_string(img, lang='fas+eng')
    return text


def _pdf_to_text(path: str) -> str:
    if pytesseract is None:
        raise RuntimeError('pytesseract or dependencies not installed')
    pages = convert_from_path(path)
    texts = []
    for p in pages:
        texts.append(pytesseract.image_to_string(p, lang='fas+eng'))
    return '\n'.join(texts)


def parse_invoice_file(path: str) -> Dict[str, Any]:
    """Best-effort invoice parsing: returns a draft invoice dict.

    The output is a dictionary with keys: party (str), date (str), items (list), subtotal, tax, total
    Items are dicts with description, quantity, unit_price, total.
    """
    ext = os.path.splitext(path)[1].lower()
    if ext == '.pdf':
        text = _pdf_to_text(path)
    else:
        text = _image_to_text(path)

    # Normalize whitespace
    text = re.sub(r"\r", "\n", text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    # Heuristics: find party line (look for words like TO:, BUYER:, فروشنده, خریدار)
    party = None
    for ln in lines[:15]:
        if re.search(r'(?i)(to:|buyer:|seller:| فروشنده| خریدار|طرف)', ln):
            party = ln
            break
    if not party and lines:
        party = lines[0]

    # Find a date (ISO-like or dd/mm/yyyy or yyyy-mm-dd)
    date = None
    date_re = re.compile(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})')
    for ln in lines[:40]:
        m = date_re.search(ln)
        if m:
            date = m.group(1)
            break
    if not date:
        # try dd/mm/yyyy
        date_re2 = re.compile(r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})')
        for ln in lines[:40]:
            m = date_re2.search(ln)
            if m:
                date = m.group(1)
                break

    # Extract monetary amounts; the largest number likely the total
    amounts = []
    for ln in lines:
        for num in re.findall(r'\d[\d,\.]+', ln.replace('٬', ',')):
            try:
                cleaned = num.replace(',', '').replace('٬', '')
                val = float(cleaned)
                amounts.append((val, ln))
            except Exception:
                continue
    subtotal = None
    total = None
    if amounts:
        # choose largest as total
        amounts_sorted = sorted(amounts, key=lambda x: x[0], reverse=True)
        total = amounts_sorted[0][0]
        if len(amounts_sorted) > 1:
            subtotal = amounts_sorted[1][0]

    # Try to extract line items: look for lines containing at least two numbers (qty and price)
    items: List[Dict[str, Any]] = []
    for ln in lines:
        nums = re.findall(r'\d[\d,\.]+', ln)
        if len(nums) >= 2:
            # Heuristic mapping: last number = total or price, previous = qty
            try:
                last = float(nums[-1].replace(',', '').replace('٬', ''))
                prev = float(nums[-2].replace(',', '').replace('٬', ''))
                desc = re.sub(r'\d[\d,\.\s]+$', '', ln).strip()
                items.append({
                    'description': desc or ln,
                    'quantity': int(prev) if prev.is_integer() else prev,
                    'unit_price': last,
                    'total': last * (int(prev) if prev.is_integer() else prev),
                })
            except Exception:
                continue

    return {
        'party': party,
        'date': date,
        'items': items,
        'subtotal': subtotal,
        'total': total,
        'raw_text_preview': '\n'.join(lines[:200])
    }


def parse_payment_file(path: str) -> Dict[str, Any]:
    """Extract best-effort payment/receipt info: amount, date, party, reference."""
    try:
        draft = parse_invoice_file(path)
    except Exception:
        # fallback: attempt OCR directly
        ext = os.path.splitext(path)[1].lower()
        if ext == '.pdf':
            text = _pdf_to_text(path)
        else:
            text = _image_to_text(path)
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        draft = {'party': lines[0] if lines else None, 'date': None, 'items': [], 'subtotal': None, 'total': None, 'raw_text_preview': '\n'.join(lines[:200])}

    # Map invoice draft to payment fields
    amount = draft.get('total') or draft.get('subtotal')
    party = draft.get('party')
    date = draft.get('date')
    # Try to extract a reference (look for 'ref' or 'شماره' keywords)
    ref = None
    txt = draft.get('raw_text_preview', '')
    m = re.search(r'(?i)(ref[:\s]*|reference[:\s]*|شماره[:\s]*)([\w\-\d\/]+)', txt)
    if m:
        ref = m.group(2)

    return {
        'party': party,
        'date': date,
        'amount': int(amount) if amount is not None else None,
        'reference': ref,
        'raw_text_preview': draft.get('raw_text_preview')
    }
