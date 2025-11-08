import re

PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
LATIN_DIGITS = '0123456789'

ARABIC_TO_PERSIAN = {
    '\u0643': 'ک',
    '\u064A': 'ی',
    '\u0626': 'ی',
    '\u0629': 'ه',
    '\u0624': 'و',
    '\u0623': 'ا',
    '\u0625': 'ا',
    '\u0622': 'ا',
}


def digits_to_latin(s: str) -> str:
    out = []
    for ch in s:
        if ch in PERSIAN_DIGITS:
            out.append(str(PERSIAN_DIGITS.index(ch)))
        elif ch in ARABIC_INDIC_DIGITS:
            out.append(str(ARABIC_INDIC_DIGITS.index(ch)))
        else:
            out.append(ch)
    return ''.join(out)


def replace_arabic_letters(s: str) -> str:
    return ''.join(ARABIC_TO_PERSIAN.get(c, c) for c in s)


def remove_tatweel_zwnj(s: str) -> str:
    return re.sub(r'[\u0640\u200c\u200b\u00AD]', '', s)


def normalize_spaces(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()


def normalize_for_search(s: str) -> str:
    if s is None:
        return ''
    s2 = digits_to_latin(s)
    s2 = replace_arabic_letters(s2)
    s2 = remove_tatweel_zwnj(s2)
    s2 = normalize_spaces(s2)
    return s2.lower()
