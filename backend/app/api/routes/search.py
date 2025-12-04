from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.search import search_multi, suggest_live

router = APIRouter()


@router.post('')
def api_search(payload: dict, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    q = payload.get('q') if isinstance(payload, dict) else None
    if not q:
        raise HTTPException(status_code=400, detail='q required')
    indexes = payload.get('indexes') if isinstance(payload, dict) else None
    filters = payload.get('filters') if isinstance(payload, dict) else None
    limit = int(payload.get('limit') or 10)
    try:
        res = search_multi(q, indexes=indexes, filters=filters, limit=limit)
        # Fallback to DB search when full-text engine is unavailable or returns empty
        idxs = indexes or ['products', 'persons', 'invoices', 'payments']
        def _is_all_empty(result: dict) -> bool:
            try:
                return all((not result.get(ix) or len(result.get(ix, {}).get('hits', [])) == 0) for ix in idxs)
            except Exception:
                return True
        if _is_all_empty(res):
            out = {}
            qlike = f"%{q}%"
            # products
            if 'products' in idxs:
                prods = session.query(models.Product).filter(
                    (models.Product.name.ilike(qlike)) |
                    (models.Product.name_norm.ilike(qlike)) |
                    (models.Product.code.ilike(qlike)) |
                    (models.Product.group.ilike(qlike))
                ).limit(limit).all()
                out['products'] = {'hits': [
                    {
                        'id': p.id,
                        'name': p.name,
                        'unit': p.unit,
                        'group': p.group,
                        'inventory': int(p.inventory or 0),
                    } for p in prods
                ]}
            # persons
            if 'persons' in idxs:
                people = session.query(models.Person).filter(
                    (models.Person.name.ilike(qlike)) |
                    (models.Person.name_norm.ilike(qlike)) |
                    (models.Person.mobile.ilike(qlike))
                ).limit(limit).all()
                out['persons'] = {'hits': [
                    {
                        'id': pr.id,
                        'name': pr.name,
                        'mobile': pr.mobile,
                        'kind': pr.kind,
                    } for pr in people
                ]}
            # invoices
            if 'invoices' in idxs:
                invs = session.query(models.Invoice).filter(
                    (models.Invoice.invoice_number.ilike(qlike)) |
                    (models.Invoice.party_name.ilike(qlike))
                ).order_by(models.Invoice.id.desc()).limit(limit).all()
                out['invoices'] = {'hits': [
                    {
                        'id': i.id,
                        'invoice_number': i.invoice_number,
                        'invoice_type': i.invoice_type,
                        'party_name': i.party_name,
                        'total': int(i.total or 0),
                        'status': i.status,
                        'server_time': i.server_time.isoformat() if i.server_time else None,
                    } for i in invs
                ]}
            # payments
            if 'payments' in idxs:
                pays = session.query(models.Payment).filter(
                    (models.Payment.payment_number.ilike(qlike)) |
                    (models.Payment.party_name.ilike(qlike)) |
                    (models.Payment.reference.ilike(qlike))
                ).order_by(models.Payment.id.desc()).limit(limit).all()
                out['payments'] = {'hits': [
                    {
                        'id': p.id,
                        'payment_number': p.payment_number,
                        'direction': p.direction,
                        'party_name': p.party_name,
                        'amount': int(p.amount or 0),
                        'method': p.method,
                        'status': p.status,
                        'server_time': p.server_time.isoformat() if p.server_time else None,
                    } for p in pays
                ]}
            return out
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/live')
def api_search_live(q: Optional[str] = None, index: Optional[str] = 'products', limit: Optional[int] = 7, current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    if not q:
        return {'hits': []}
    hits = suggest_live(q, index=index, limit=limit)
    return {'hits': hits}
