from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas, external_search
from app.api.deps import get_current_user, require_roles
from app.db import get_db

router = APIRouter()


@router.post("", response_model=schemas.ProductOut)
def api_create_product(p: schemas.ProductCreate, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    # basic RBAC: only Accountant or Admin can create products
    require_roles(role_names=["Admin", "Accountant"])(current)
    prod = crud.create_product(session, p)
    return prod


@router.get("")
def api_get_products(q: Optional[str] = None, limit: int = 50, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    # viewers and above can list
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    limit = max(1, min(int(limit or 50), 500))
    return crud.get_products(session, q=q, limit=limit)


@router.post('/external/search')
def api_products_external_search(payload: schemas.ExternalSearchRequest, current: models.User = Depends(get_current_user)):
    """Search external Iranian marketplaces (Digikala, Torob, Emalls) and return aggregated results.
    This is best-effort scraping and may be rate-limited or blocked by the remote sites.
    """
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    q = payload.q
    sources = payload.sources
    limit = int(payload.limit or 6)
    try:
        res = external_search.aggregate_search(q, sources=sources, limit=limit)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/external/save', response_model=schemas.ProductOut)
def api_products_external_save(payload: schemas.SaveExternalProductRequest, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """Save an external product result as a local product so it can be used in invoices.
    The external metadata is embedded into the product description as JSON. Optionally a price history entry is added.
    """
    require_roles(role_names=["Admin", "Accountant"])(current)
    try:
        external = {
            'source': payload.source,
            'title': payload.title,
            'price': payload.price,
            'currency': payload.currency,
            'image': payload.image,
            'description': payload.description,
            'link': payload.link,
        }
        prod = crud.create_product_from_external(session, external=external, unit=payload.unit, group=payload.group, create_price_history=payload.create_price_history)
        return prod
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/{product_id}/movement')
def product_movement(product_id: str, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """Get movement history for a product with invoice and party details"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    
    # Get product details
    product = session.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    
    # Get all invoice items for this product
    invoice_items = session.query(models.InvoiceItem).filter(
        models.InvoiceItem.product_id == product_id
    ).order_by(models.InvoiceItem.id.desc()).all()
    
    movements = []
    current_stock = product.inventory or 0
    
    for item in invoice_items:
        invoice = session.query(models.Invoice).filter(models.Invoice.id == item.invoice_id).first()
        if not invoice:
            continue
            
        person = None
        if invoice.party_id:
            person = session.query(models.Person).filter(models.Person.id == invoice.party_id).first()
        
        # Determine movement type based on invoice type
        is_sale = invoice.invoice_type == 'sale'
        is_purchase = invoice.invoice_type == 'purchase'
        quantity_change = -item.quantity if is_sale else item.quantity if is_purchase else 0
        
        movements.append({
            'id': item.id,
            'invoice_id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'invoice_date': (invoice.client_time or invoice.server_time).isoformat() if (invoice.client_time or invoice.server_time) else None,
            'invoice_type': invoice.invoice_type,
            'direction': 'out' if is_sale else 'in' if is_purchase else 'neutral',
            'type': 'فروش' if is_sale else 'خرید' if is_purchase else 'سایر',
            'quantity': item.quantity,
            'quantity_change': quantity_change,
            'unit_price': item.unit_price,
            'total_price': item.total or (item.unit_price * item.quantity),
            'party': {
                'id': person.id,
                'name': person.name,
                'kind': person.kind,
            } if person else None,
            'status': invoice.status,
        })
    
    # Calculate running stock (from most recent backwards)
    running_stock = current_stock
    for movement in movements:
        movement['stock_after'] = running_stock
        running_stock -= movement['quantity_change']
        movement['stock_before'] = running_stock
    
    return {
        'product': {
            'id': product.id,
            'name': product.name,
            'unit': product.unit,
            'group': product.group,
            'current_stock': current_stock,
        },
        'movements': movements,
        'total_movements': len(movements),
    }
