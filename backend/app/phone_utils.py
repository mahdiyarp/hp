from __future__ import annotations

from typing import Optional, List

# Local, robust digit conversion to avoid dependency on possibly corrupted mappings
_PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
_ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

def _digits_to_latin(s: str) -> str:
    out = []
    for ch in s:
        if ch in _PERSIAN_DIGITS:
            out.append(str(_PERSIAN_DIGITS.index(ch)))
        elif ch in _ARABIC_INDIC_DIGITS:
            out.append(str(_ARABIC_INDIC_DIGITS.index(ch)))
        else:
            out.append(ch)
    return ''.join(out)


def normalize_iran_mobile(phone: str) -> Optional[str]:
    """Normalize Iranian mobile numbers to 11-digit format starting with '0'.
    Accepts inputs like '+98912...', '98912...', '0098912...', '0912...', '912...',
    and with Persian/Arabic digits.

    Returns normalized string like '09123456789' or None if invalid.
    """
    if not phone:
        return None
    s = _digits_to_latin(str(phone))
    s = s.strip().replace(' ', '').replace('-', '').replace('\u200c', '')
    # Keep leading + for parsing, strip others
    if s.startswith('+'):
        s = s[1:]
    # Remove leading 00 (international prefix)
    if s.startswith('00'):
        s = s[2:]
    # Country code forms
    if s.startswith('98'):
        rest = s[2:]
        if not rest:
            return None
        s = '0' + rest
    # If starts with 9 and length 10, add 0
    if s.startswith('9') and len(s) == 10:
        s = '0' + s
    # Validate final form: 11 digits starting with 0
    if len(s) == 11 and s.startswith('0') and s[1:].isdigit():
        return s
    return None


def iran_mobile_variants(value: str) -> List[str]:
    """Return common equivalent variants for a normalized Iranian mobile.
    Input must be a mobile number; will be normalized internally.
    Output includes canonical '0912...', '+98912...', and '912...'.
    """
    n = normalize_iran_mobile(value)
    if not n:
        return []
    bare = n[1:]
    intl = '+98' + bare
    no0 = bare
    return [n, intl, no0]
