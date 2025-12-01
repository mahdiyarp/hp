import csv
from typing import List, Dict, Any
from pathlib import Path
import uuid

EXPORT_DIR = Path(__file__).parents[2] / 'exports'
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

def save_csv(rows: List[Dict[str, Any]], filename: str = None) -> str:
    fn = filename or f"report-{uuid.uuid4().hex[:8]}.csv"
    path = EXPORT_DIR / fn
    if not rows:
        # write empty file with header
        with open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write('')
        return str(path)
    headers = list(rows[0].keys())
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(headers)
        for r in rows:
            w.writerow([r.get(h, '') for h in headers])
    return str(path)
