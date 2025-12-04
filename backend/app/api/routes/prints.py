from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
import os

router = APIRouter()


@router.get('/invoice/{invoice_id}', response_class=HTMLResponse)
def print_invoice_html(invoice_id: int):
    """Return a responsive HTML invoice template that will fetch invoice JSON and render for print."""
    tpl = os.path.join(os.path.dirname(__file__), '..', '..', 'templates', 'invoice.html')
    if not os.path.exists(tpl):
        raise HTTPException(status_code=404, detail='template not found')
    return FileResponse(tpl, media_type='text/html')
