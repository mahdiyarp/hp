
import re
from pathlib import Path

def get_arabic_persian_score(s: str) -> int:
    """Calculates the number of Arabic/Persian characters in a string."""
    ARABIC_PERSIAN_RE = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]')
    return len(ARABIC_PERSIAN_RE.findall(s))

def try_fix_bytes(file_bytes: bytes) -> (str, bool):
    """
    Attempts to fix the encoding of a byte string.
    Returns a tuple of (fixed_text, changed_flag).
    """
    # 1. Try to decode as UTF-8 first.
    try:
        utf8_text = file_bytes.decode('utf-8')
        # Check for common mojibake: text was UTF-8 but decoded as latin1/cp1252
        try:
            recovered_text = utf8_text.encode('latin1').decode('utf-8')
            if get_arabic_persian_score(recovered_text) > get_arabic_persian_score(utf8_text):
                return recovered_text, True
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        
        # Also check if it was mis-saved as cp1256
        try:
            cp1256_text = file_bytes.decode('cp1256')
            if get_arabic_persian_score(cp1256_text) > get_arabic_persian_score(utf8_text):
                return cp1256_text, True
        except (UnicodeDecodeError):
            pass

        # If no improvement, the original UTF-8 was likely correct.
        return utf8_text, False
    except UnicodeDecodeError:
        # UTF-8 decoding failed, so it's likely a legacy encoding.
        pass

    # 2. Try legacy encodings if UTF-8 fails.
    for enc in ('cp1256', 'cp1252', 'latin1'):
        try:
            decoded_text = file_bytes.decode(enc)
            # If it contains Arabic/Persian characters, we assume it's a success.
            if get_arabic_persian_score(decoded_text) > 0:
                return decoded_text, True
            # Also try the mojibake recovery on this decoded text
            try:
                recovered_text = decoded_text.encode('latin1').decode('utf-8')
                if get_arabic_persian_score(recovered_text) > 0:
                    return recovered_text, True
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
        except UnicodeDecodeError:
            continue

    # 3. If all else fails, decode with replacement to avoid data loss.
    return file_bytes.decode('utf-8', errors='replace'), False

file_path = Path('frontend/src/utils/num.ts')
original_bytes = file_path.read_bytes()
fixed_text, has_changed = try_fix_bytes(original_bytes)
if has_changed:
    print(fixed_text)
else:
    print("No changes needed")
