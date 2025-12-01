#!/usr/bin/env python3
"""
Normalize i18n JSON files to UTF-8 and ensure correct JSON encoding (no escaped unicode).
Usage: python tools/fix_i18n.py
"""
import json
from pathlib import Path

base = Path('frontend/src')
found = []
for p in base.rglob('i18n/*.json'):
    try:
        text = p.read_text(encoding='utf-8')
        data = json.loads(text)
    except Exception:
        # try fallback decodings
        raw = p.read_bytes()
        for enc in ('utf-8', 'cp1256', 'cp1252', 'latin1'):
            try:
                text = raw.decode(enc)
                data = json.loads(text)
                break
            except Exception:
                data = None
        if data is None:
            print(f"Failed to parse {p}")
            continue
    # write back with ensure_ascii=False and indent minimal
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    found.append(str(p))

if found:
    print('Normalized i18n files:')
    for f in found:
        print(' -', f)
else:
    print('No i18n files changed.')
