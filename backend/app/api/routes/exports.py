from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app import crud, models
from app.api.deps import get_current_user, require_roles
from app.db import get_db, DB
from app.exports import (
    export_invoice_pdf,
    export_invoice_csv,
    export_invoice_excel,
    export_sale_order_csv,
    export_sale_order_pdf,
    export_sale_order_excel,
    share_exported_file,
)
import os

router = APIRouter()


@router.post('/invoice/{invoice_id}')
def api_export_invoice(invoice_id: int, format: Optional[str] = 'pdf', session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    try:
        if format == 'pdf':
            path = export_invoice_pdf(session, invoice_id)
        elif format == 'csv':
            path = export_invoice_csv(session, invoice_id)
        elif format in ('xls', 'xlsx'):
            path = export_invoice_excel(session, invoice_id)
        else:
            raise HTTPException(status_code=400, detail='unsupported format')
        return share_exported_file(session, current.id, path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/sale-order/{order_id}')
def api_export_sale_order(order_id: int, format: Optional[str] = 'csv', session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """Export a sale order in requested format (csv, pdf, xlsx)."""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Salesman'])(current)
    try:
        if format == 'csv':
            path = export_sale_order_csv(session, order_id)
        elif format == 'pdf':
            path = export_sale_order_pdf(session, order_id)
        elif format in ('xls', 'xlsx'):
            path = export_sale_order_excel(session, order_id)
        else:
            raise HTTPException(status_code=400, detail='unsupported format')
        return share_exported_file(session, current.id, path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/shared/{token}')
def download_shared_file(token: str):
    # public download of shared file if not expired
    # create a short-lived session to lookup the shared file
    sf = crud.get_shared_file_by_token(DB.SessionLocal(), token)
    if not sf:
        raise HTTPException(status_code=404, detail='not found')
    from datetime import datetime, timezone
    if sf.expires_at and sf.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail='expired')
    # serve file
    from fastapi.responses import FileResponse
    return FileResponse(sf.file_path, filename=sf.filename or os.path.basename(sf.file_path))
