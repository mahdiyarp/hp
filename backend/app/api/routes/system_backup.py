import os
import io
import json
import tarfile
from datetime import datetime, timezone
from typing import Optional, Any, List, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ... import db, models
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/system", tags=["System - Backup"])

# Use project-local backups directory instead of a hardcoded /app path to avoid permission issues.
# Resolve relative to this file's parent (backend/app/api/routes/ -> backend/backups)
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
_candidate_dir = os.path.join(_BASE_DIR, 'backups')
if not os.path.isdir(_candidate_dir):
    try:
        os.makedirs(_candidate_dir, exist_ok=True)
    except Exception:
        import tempfile
        _candidate_dir = tempfile.mkdtemp(prefix='hp-backups-')
BACKUP_DIR = _candidate_dir  # single assignment to satisfy constant rule


def _dump_table(session: Session, model: Any, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    q = session.query(model)
    if limit:
        q = q.limit(limit)
    rows = q.all()
    out = []
    for r in rows:
        data = {}
        for c in r.__table__.columns:  # type: ignore
            data[c.name] = getattr(r, c.name)
        out.append(data)
    return out


@router.post("/backup")
def create_backup(
    _, session: Session = Depends(db.get_db),
    __: models.User = Depends(require_roles(role_names=["Admin"]))
) -> Dict[str, Any]:
    ts = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    fname = f"backup-{ts}.tar.gz"
    fpath = os.path.join(BACKUP_DIR, fname)

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        datasets: Dict[str, List[Dict[str, Any]]] = {
            'users.json': _dump_table(session, models.User),
            'persons.json': _dump_table(session, models.Person),
            'products.json': _dump_table(session, models.Product),
            'invoices.json': _dump_table(session, models.Invoice),
            'invoice_items.json': _dump_table(session, models.InvoiceItem),
            'payments.json': _dump_table(session, models.Payment),
            'cheques.json': _dump_table(session, models.Cheque),
            'ledger_entries.json': _dump_table(session, models.LedgerEntry),
            'product_prices.json': _dump_table(session, models.ProductPrice),
        }
        for name, data in datasets.items():
            content = json.dumps(data, default=str).encode('utf-8')
            info = tarfile.TarInfo(name)
            info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    with open(fpath, 'wb') as f:
        f.write(buf.getvalue())

    # Record backup
    b = models.Backup(
        filename=fname,
        file_path=fpath,
        kind='manual'
    )
    session.add(b)
    session.commit()

    return {"filename": fname, "file_path": fpath}


@router.post("/restore")
def restore_backup(
    filename: str,
    __: models.User = Depends(require_roles(role_names=["Admin"]))
) -> Dict[str, Any]:
    fpath = os.path.join(BACKUP_DIR, filename)
    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="backup file not found")
    # For now, return a token for manual review — full restore process can be added incrementally
    return {"ok": True, "file": fpath}
