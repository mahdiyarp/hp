from . import models, schemas
import secrets
from sqlalchemy.orm import Session
from typing import Optional, List
from sqlalchemy.sql import func
from datetime import datetime, timezone
from datetime import timedelta
import jdatetime
import requests
import math
from .schemas import ProductCreate, ProductOut, PersonCreate
from .normalizer import normalize_for_search
import hashlib
import json
from . import search as search_client
from .security import encrypt_value


# ==================== Role & Permission CRUD ====================

def get_role(session: Session, role_id: int) -> Optional[models.Role]:
    """دریافت نقش بر اساس ID"""
    return session.query(models.Role).filter(models.Role.id == role_id).first()


def get_role_by_name(session: Session, name: str) -> Optional[models.Role]:
    """دریافت نقش بر اساس نام"""
    return session.query(models.Role).filter(models.Role.name == name).first()


def get_all_roles(session: Session) -> List[models.Role]:
    """دریافت تمام نقش ها"""
    return session.query(models.Role).all()


def get_permissions_by_module(session: Session, module: str) -> List[models.Permission]:
    """دریافت permissions یک ماژول"""
    return session.query(models.Permission).filter(models.Permission.module == module).all()


def get_all_permissions(session: Session) -> List[models.Permission]:
    """دریافت تمام permissions"""
    return session.query(models.Permission).all()


def _normalize_username(raw: str) -> str:
    return normalize_for_search(raw or '')


def create_user(session: Session, user: schemas.UserCreate):
    from .security import get_password_hash
    username_norm = _normalize_username(user.username)
    if not username_norm:
        raise ValueError('Username required')
    existing = get_user_by_username(session, user.username)
    if existing:
        raise ValueError('Username already exists')
    
    # If role_id not specified, get Viewer role (ID should be 5 based on migration)
    role_id = user.role_id
    if not role_id:
        viewer_role = session.query(models.Role).filter(models.Role.name == 'Viewer').first()
        if viewer_role:
            role_id = viewer_role.id
        else:
            role_id = 5  # Default fallback
    
    db_user = models.User(
        username=username_norm,
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        role='User',  # Legacy field, not used with role_id
        role_id=role_id,
        is_active=True,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def make_hash_id(obj: dict) -> str:
    # canonical JSON over selected attributes + timestamp
    payload = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    h = hashlib.sha256()
    h.update(payload.encode('utf-8'))
    return h.hexdigest()


def create_product(session: Session, p: ProductCreate) -> models.Product:
    norm = normalize_for_search(p.name)
    raw = {"name": p.name, "unit": p.unit or '', "group": p.group or '', "created_at": str(func.now())}
    pid = make_hash_id(raw)
    product = models.Product(id=pid, name=p.name, name_norm=norm, code=p.code or '', unit=p.unit, group=p.group, description=p.description)
    session.add(product)
    session.commit()
    session.refresh(product)
    # index into search
    try:
        search_client.index_product({
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'unit': product.unit,
            'group': product.group,
            'inventory': product.inventory,
        })
    except Exception:
        pass
    # activity log
    try:
        from .activity_logger import log_activity
        uname = None
        # best-effort map: no session access to find user here; API layer should pass username when possible
        log_activity(session, uname, f"ایجاد کالا: {product.name} (id={product.id})", path=f"/api/products", method='POST', status_code=201, detail={'product_id': product.id})
    except Exception:
        pass
    return product


def create_product_from_external(session: Session, external: dict, unit: Optional[str] = None, group: Optional[str] = None, create_price_history: bool = True) -> models.Product:
    """
    Create a local product from external search result. `external` expected keys: title, price, image, description, link, source
    Stores the external metadata inside the product.description as a JSON blob (best-effort).
    """
    from .normalizer import normalize_for_search
    from datetime import datetime
    # prepare product create payload
    title = external.get('title') or external.get('name') or 'external-product'
    desc = external.get('description') or ''
    # embed metadata
    meta = {
        'source': external.get('source'),
        'source_link': external.get('link') or external.get('source_url'),
        'image': external.get('image'),
        'raw': external.get('raw') or external,
    }
    full_desc = desc + '\n\n' + json.dumps(meta, ensure_ascii=False)
    p = ProductCreate(name=title, unit=unit, group=group, description=full_desc)
    prod = create_product(session, p)
    # optional price history
    try:
        price = external.get('price')
        if create_price_history and price:
            ph = models.PriceHistory(product_id=prod.id, price=int(price), type='sell', effective_at=datetime.utcnow())
            session.add(ph)
            session.commit()
    except Exception:
        pass
    return prod


def get_products(session: Session, q: Optional[str] = None, limit: int = 50):
    qs = session.query(models.Product)
    if q:
        qn = normalize_for_search(q)
        qs = qs.filter(models.Product.name_norm.contains(qn))
    return qs.limit(limit).all()


def create_person(session: Session, p: PersonCreate) -> models.Person:
    norm = normalize_for_search(p.name)
    raw = {"name": p.name, "kind": p.kind or '', "mobile": p.mobile or '', "created_at": str(func.now())}
    pid = make_hash_id(raw)
    person = models.Person(id=pid, name=p.name, name_norm=norm, kind=p.kind, mobile=p.mobile, description=p.description, code=p.code or '')
    session.add(person)
    session.commit()
    session.refresh(person)
    try:
        search_client.index_person({
            'id': person.id,
            'name': person.name,
            'mobile': person.mobile,
            'description': person.description,
        })
    except Exception:
        pass
    try:
        from .activity_logger import log_activity
        log_activity(session, None, f"ایجاد شخص: {person.name} (id={person.id})", path=f"/api/persons", method='POST', status_code=201, detail={'person_id': person.id})
    except Exception:
        pass
    return person


def get_persons(session: Session, q: Optional[str] = None, limit: int = 50):
    qs = session.query(models.Person)
    if q:
        qn = normalize_for_search(q)
        qs = qs.filter(models.Person.name_norm.contains(qn))
    return qs.limit(limit).all()


def get_users(session: Session):
    return session.query(models.User).all()


def create_time_sync(session: Session, time_in: schemas.TimeSyncCreate):
    # server_time should be set by server side to ensure canonical server timestamp
    from datetime import datetime, timezone
    server_time = datetime.now(timezone.utc)
    db_obj = models.TimeSync(client_time=time_in.client_time, server_time=server_time)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_time_syncs(session: Session, limit: int = 100):
    return session.query(models.TimeSync).order_by(models.TimeSync.id.desc()).limit(limit).all()


def get_user_by_username(session: Session, username: str):
    uname = _normalize_username(username)
    return session.query(models.User).filter(func.lower(models.User.username) == uname).first()


def get_user(session: Session, user_id: int):
    return session.query(models.User).filter(models.User.id == user_id).first()


def set_assistant_enabled(session: Session, user_id: int, enabled: bool):
    u = session.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        return None
    u.assistant_enabled = bool(enabled)
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def authenticate_user(session: Session, username: str, password: str):
    from .security import verify_password
    user = get_user_by_username(session, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def set_refresh_token(session: Session, user: models.User, refresh_token: str):
    from .security import get_password_hash
    user.refresh_token_hash = get_password_hash(refresh_token)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def clear_refresh_token(session: Session, user: models.User):
    user.refresh_token_hash = None
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def verify_refresh_token(session: Session, user: models.User, refresh_token: str) -> bool:
    from .security import verify_password
    if not user.refresh_token_hash:
        return False
    return verify_password(refresh_token, user.refresh_token_hash)


def set_user_otp_secret(session: Session, user: models.User, secret: Optional[str], enabled: bool = False):
    user.otp_secret = encrypt_value(secret) if secret else None
    user.otp_enabled = bool(enabled and secret)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def enable_user_otp(session: Session, user: models.User):
    user.otp_enabled = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def disable_user_otp(session: Session, user: models.User):
    user.otp_secret = None
    user.otp_enabled = False
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def revoke_refresh_token(session: Session, user: models.User):
    user.refresh_token_hash = None
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _generate_invoice_number(session: Session, invoice_type: str) -> str:
    # Format: {TYPELETTER}{YYYY}{MM}{DD}-{id:06d}
    # We will create invoice first to get id; helper for after-commit numbering.
    now = datetime.utcnow()
    prefix = invoice_type[:1].upper() if invoice_type else 'I'
    return f"{prefix}{now.year:04d}{now.month:02d}{now.day:02d}"


def create_invoice_manual(session: Session, inv: schemas.InvoiceCreate) -> models.Invoice:
    # create invoice record without invoice_number, then set number using id
    server_time = datetime.now(timezone.utc)
    client_time = inv.client_time or server_time
    # tracking code generation
    tracking_code = f"TRC-{int(server_time.timestamp())}-{secrets.token_hex(3).upper()}"
    invoice = models.Invoice(
        invoice_type=inv.invoice_type,
        mode=inv.mode or 'manual',
        party_id=inv.party_id,
        party_name=inv.party_name,
        client_time=client_time,
        server_time=server_time,
        status='draft',
        tracking_code=tracking_code,
        note=inv.note,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    # set invoice_number based on date + id
    reference_dt = client_time or server_time
    # ensure naive datetime for jdatetime conversion
    ref_for_calendar = reference_dt
    if isinstance(ref_for_calendar, datetime) and ref_for_calendar.tzinfo is not None:
        ref_for_calendar = ref_for_calendar.astimezone(timezone.utc).replace(tzinfo=None)
    if isinstance(reference_dt, datetime):
        if reference_dt.tzinfo is None:
            ref_aware = reference_dt.replace(tzinfo=timezone.utc)
        else:
            ref_aware = reference_dt.astimezone(timezone.utc)
    else:
        ref_aware = server_time
    date_part = ref_aware.strftime('%Y%m%d')
    if inv.client_calendar == 'jalali':
        try:
            jdt = jdatetime.datetime.fromgregorian(datetime=ref_for_calendar)
            date_part = jdt.strftime('%Y%m%d')
        except Exception:
            # fallback gracefully to gregorian date_part
            date_part = reference_dt.astimezone(timezone.utc).strftime('%Y%m%d')
    prefix = inv.invoice_type[:1].upper() if inv.invoice_type else 'I'
    invoice.invoice_number = f"{prefix}-{date_part}-{invoice.id:06d}"
    # add items
    subtotal = 0
    for it in inv.items:
        total = int(it.unit_price) * int(it.quantity)
        ii = models.InvoiceItem(
            invoice_id=invoice.id,
            description=it.description,
            quantity=int(it.quantity),
            unit=it.unit,
            unit_price=int(it.unit_price),
            total=total,
            product_id=it.product_id,  # Added product_id
        )
        session.add(ii)
        subtotal += total
    invoice.subtotal = subtotal
    invoice.total = subtotal  # simple: no tax calc by default
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    # attach items for convenience
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).all()
    invoice.items = items
    # index invoice in search
    try:
        search_client.index_invoice({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'invoice_type': invoice.invoice_type,
            'status': invoice.status,
            'party_id': invoice.party_id,
            'party_name': invoice.party_name,
            'total': invoice.total,
        })
    except Exception:
        pass
    try:
        from .activity_logger import log_activity
        # use party_name or party_id for context
        who = inv.party_name or inv.party_id or None
        log_activity(session, who, f"صدور فاکتور {invoice.invoice_number}", path=f"/api/invoices/manual", method='POST', status_code=201, detail={'invoice_id': invoice.id})
    except Exception:
        pass
    return invoice


def get_invoices(session: Session, q: Optional[str] = None, limit: int = 100) -> List[models.Invoice]:
    qs = session.query(models.Invoice).order_by(models.Invoice.id.desc())
    if q:
        # search by invoice_number or party_name
        qn = q.lower()
        qs = qs.filter((models.Invoice.invoice_number.ilike(f"%{qn}%")) | (models.Invoice.party_name.ilike(f"%{qn}%")))
    return qs.limit(limit).all()


def get_invoice(session: Session, invoice_id: int):
    inv = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    # attach items
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    # simple attach for convenience
    inv._items = items
    return inv


def update_invoice(session: Session, invoice_id: int, data: dict):
    inv = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    for k, v in data.items():
        if hasattr(inv, k):
            setattr(inv, k, v)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return inv


def finalize_invoice(session: Session, invoice_id: int, client_time: Optional[datetime] = None):
    inv = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    inv.status = 'final'
    if client_time:
        inv.client_time = client_time
    inv.server_time = datetime.now(timezone.utc)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    
    # Update inventory based on invoice items and type
    try:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice_id).all()
        for item in items:
            if item.product_id:
                product = session.query(models.Product).filter(models.Product.id == item.product_id).first()
                if product:
                    if inv.invoice_type == 'sale':
                        # Decrease inventory for sales
                        product.inventory = (product.inventory or 0) - item.quantity
                    elif inv.invoice_type == 'purchase':
                        # Increase inventory for purchases
                        product.inventory = (product.inventory or 0) + item.quantity
                    session.add(product)
        session.commit()
    except Exception as e:
        print(f"Inventory update error: {e}")
        pass
    
    # Create ledger entries for inventory and revenue based on invoice_type
    try:
        # sale: debit AR/Cash, credit Sales (or COGS/Inventory)
        # purchase: debit Expense/Inventory, credit AP/Cash
        if inv.invoice_type == 'sale':
            create_ledger_entry(session,
                                ref_type='invoice',
                                ref_id=str(inv.id),
                                debit_account='AccountsReceivable',
                                credit_account='Sales',
                                amount=int(inv.total or 0),
                                party_id=inv.party_id,
                                party_name=inv.party_name,
                                description=f'Sale Invoice {inv.invoice_number}',
                                tracking_code=inv.tracking_code)
        elif inv.invoice_type == 'purchase':
            create_ledger_entry(session,
                                ref_type='invoice',
                                ref_id=str(inv.id),
                                debit_account='Inventory',
                                credit_account='AccountsPayable',
                                amount=int(inv.total or 0),
                                party_id=inv.party_id,
                                party_name=inv.party_name,
                                description=f'Purchase Invoice {inv.invoice_number}',
                                tracking_code=inv.tracking_code)
    except Exception as e:
        print(f"Ledger creation error: {e}")
        pass
    
    try:
        from .activity_logger import log_activity
        log_activity(session, inv.party_name or None, f"تأیید/پایان فاکتور {inv.invoice_number}", path=f"/api/invoices/{inv.id}/finalize", method='POST', status_code=200, detail={'invoice_id': inv.id})
    except Exception:
        pass
    return inv


def _generate_payment_number(session: Session, direction: str) -> str:
    now = datetime.utcnow()
    prefix = 'R' if direction == 'in' else 'P'
    return f"{prefix}{now.year:04d}{now.month:02d}{now.day:02d}"


def create_payment_manual(session: Session, p: schemas.PaymentCreate) -> models.Payment:
    server_time = datetime.now(timezone.utc)
    client_time = p.client_time or server_time
    
    # Validate invoice_id if provided
    if p.invoice_id:
        invoice = session.query(models.Invoice).filter(models.Invoice.id == p.invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice with id {p.invoice_id} not found")
        # Auto-fill reference with invoice_number if not provided
        if not p.reference and invoice.invoice_number:
            p.reference = invoice.invoice_number
            # propagate tracking code
            if not p.tracking_code and invoice.tracking_code:
                p.tracking_code = invoice.tracking_code
        if not p.tracking_code:
            p.tracking_code = f"TRC-{int(server_time.timestamp())}-{secrets.token_hex(3).upper()}"
    
    pay = models.Payment(
        direction=p.direction,
        mode=p.mode or 'manual',
        party_id=p.party_id,
        party_name=p.party_name,
        method=p.method,
        amount=int(p.amount),
        reference=p.reference,
        invoice_id=p.invoice_id,
        client_time=client_time,
        server_time=server_time,
        status='draft',
        note=p.note,
            tracking_code=p.tracking_code,
    )
    session.add(pay)
    session.commit()
    session.refresh(pay)
    reference_dt = client_time or server_time
    ref_for_calendar = reference_dt
    if isinstance(ref_for_calendar, datetime) and ref_for_calendar.tzinfo is not None:
        ref_for_calendar = ref_for_calendar.astimezone(timezone.utc).replace(tzinfo=None)
    if isinstance(reference_dt, datetime):
        if reference_dt.tzinfo is None:
            ref_aware = reference_dt.replace(tzinfo=timezone.utc)
        else:
            ref_aware = reference_dt.astimezone(timezone.utc)
    else:
        ref_aware = server_time
    date_part = ref_aware.strftime('%Y%m%d')
    if p.client_calendar == 'jalali':
        try:
            jdt = jdatetime.datetime.fromgregorian(datetime=ref_for_calendar)
            date_part = jdt.strftime('%Y%m%d')
        except Exception:
            date_part = ref_aware.strftime('%Y%m%d')
    prefix = pay.direction[:1].upper()
    pay.payment_number = f"{prefix}-{date_part}-{pay.id:06d}"
    session.add(pay)
    session.commit()
    session.refresh(pay)
    try:
        search_client.index_payment({
            'id': pay.id,
            'payment_number': pay.payment_number,
            'direction': pay.direction,
            'status': pay.status,
            'party_id': pay.party_id,
            'party_name': pay.party_name,
            'method': pay.method,
            'amount': pay.amount,
        })
    except Exception:
        pass
    try:
        from .activity_logger import log_activity
        log_activity(session, pay.party_name or None, f"صدور رسید/سند پرداخت {pay.payment_number}", path=f"/api/payments/manual", method='POST', status_code=201, detail={'payment_id': pay.id})
    except Exception:
        pass
    return pay


def get_payments(session: Session, q: Optional[str] = None, limit: int = 100):
    qs = session.query(models.Payment).order_by(models.Payment.id.desc())
    if q:
        qn = q.lower()
        qs = qs.filter((models.Payment.payment_number.ilike(f"%{qn}%")) | (models.Payment.party_name.ilike(f"%{qn}%")))
    return qs.limit(limit).all()


def get_payment(session: Session, payment_id: int):
    return session.query(models.Payment).filter(models.Payment.id == payment_id).first()


def finalize_payment(session: Session, payment_id: int, client_time: Optional[datetime] = None):
    pay = session.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not pay:
        return None
    pay.status = 'posted'
    if client_time:
        pay.client_time = client_time
    pay.server_time = datetime.now(timezone.utc)
    session.add(pay)
    session.commit()
    session.refresh(pay)
    
    # Create ledger entry depending on direction/method
    try:
        if pay.direction == 'in':
            # receipt: debit Cash/Bank, credit AccountsReceivable
            acct = 'Cash' if (not pay.method or pay.method.lower()=='cash') else ('Bank' if 'bank' in (pay.method or '').lower() else 'POS')
            create_ledger_entry(session, 
                                ref_type='payment', 
                                ref_id=str(pay.id), 
                                debit_account=acct, 
                                credit_account='AccountsReceivable', 
                                amount=int(pay.amount or 0), 
                                party_id=pay.party_id, 
                                party_name=pay.party_name, 
                                description=f'Receipt {pay.payment_number}',
                                tracking_code=pay.tracking_code)
        else:
            # payment out: debit AccountsPayable/Expense, credit Cash/Bank
            acct = 'Cash' if (not pay.method or pay.method.lower()=='cash') else ('Bank' if 'bank' in (pay.method or '').lower() else 'POS')
            create_ledger_entry(session, 
                                ref_type='payment', 
                                ref_id=str(pay.id), 
                                debit_account='Expenses', 
                                credit_account=acct, 
                                amount=int(pay.amount or 0), 
                                party_id=pay.party_id, 
                                party_name=pay.party_name, 
                                description=f'Payment {pay.payment_number}',
                                tracking_code=pay.tracking_code)
    except Exception as e:
        print(f"Ledger creation error: {e}")
        pass
    
    try:
        from .activity_logger import log_activity
        log_activity(session, pay.party_name or None, f"تأیید/پست پرداخت {pay.payment_number}", path=f"/api/payments/{pay.id}/finalize", method='POST', status_code=200, detail={'payment_id': pay.id})
    except Exception:
        pass
    
    return pay


def create_ledger_entry(session: Session, ref_type: Optional[str], ref_id: Optional[str], debit_account: str, credit_account: str, amount: int, party_id: Optional[str] = None, party_name: Optional[str] = None, description: Optional[str] = None, tracking_code: Optional[str] = None) -> models.LedgerEntry:
    le = models.LedgerEntry(
        ref_type=ref_type,
        ref_id=ref_id,
        debit_account=debit_account,
        credit_account=credit_account,
        amount=int(amount),
        party_id=party_id,
        party_name=party_name,
        description=description,
        tracking_code=tracking_code,
    )
    session.add(le)
    session.commit()
    session.refresh(le)
    return le


def create_ai_report(session: Session, summary: str, findings: str) -> models.AIReport:
    rep = models.AIReport(summary=summary, findings=findings)
    session.add(rep)
    session.commit()
    session.refresh(rep)
    return rep


def get_ai_reports(session: Session, limit: int = 100):
    return session.query(models.AIReport).order_by(models.AIReport.report_date.desc()).limit(limit).all()


def get_ai_report(session: Session, report_id: int):
    return session.query(models.AIReport).filter(models.AIReport.id == report_id).first()


def review_ai_report(session: Session, report_id: int, status: str, reviewer_id: Optional[int] = None):
    rep = session.query(models.AIReport).filter(models.AIReport.id == report_id).first()
    if not rep:
        return None
    rep.status = status
    rep.reviewed_by = reviewer_id
    from datetime import datetime
    rep.reviewed_at = datetime.utcnow()
    session.add(rep)
    session.commit()
    session.refresh(rep)
    return rep


def get_integrations(session: Session):
    return session.query(models.IntegrationConfig).order_by(models.IntegrationConfig.name.asc()).all()


def get_integration(session: Session, integration_id: int):
    return session.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == integration_id).first()


def upsert_integration(session: Session, payload: schemas.IntegrationConfigIn):
    # find by name
    from .security import encrypt_value
    i = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.name == payload.name).first()
    enc_key = encrypt_value(payload.api_key) if hasattr(payload, 'api_key') else None
    if not i:
        i = models.IntegrationConfig(name=payload.name, provider=payload.provider, enabled=bool(payload.enabled), api_key=enc_key, config=payload.config)
        session.add(i)
    else:
        i.provider = payload.provider
        i.enabled = bool(payload.enabled)
        i.api_key = enc_key
        i.config = payload.config
        session.add(i)
    session.commit()
    session.refresh(i)
    return i


def set_integration_enabled(session: Session, integration_id: int, enabled: bool):
    i = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == integration_id).first()
    if not i:
        return None
    i.enabled = bool(enabled)
    session.add(i)
    session.commit()
    session.refresh(i)
    return i


def create_shared_file(session: Session, token: str, file_path: str, filename: str, created_by: Optional[int], expires_at: Optional[str] = None):
    from datetime import datetime
    ex = None
    if expires_at:
        try:
            ex = datetime.fromisoformat(expires_at)
        except Exception:
            ex = None
    sf = models.SharedFile(token=token, file_path=file_path, filename=filename, created_by=created_by, expires_at=ex)
    session.add(sf)
    session.commit()
    session.refresh(sf)
    return sf


def get_shared_file_by_token(session: Session, token: str):
    return session.query(models.SharedFile).filter(models.SharedFile.token == token).first()


def create_backup(session: Session, created_by: Optional[int] = None, kind: str = 'manual', note: Optional[str] = None):
    """Create a JSON snapshot backup of important tables and store on disk under backend/backups/.
    Returns a models.Backup instance.
    """
    import os, json
    from datetime import datetime
    backup_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'backups')
    # fallback to backend/backups relative to project root
    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backups'))
    os.makedirs(backup_dir, exist_ok=True)
    now = datetime.utcnow()
    fname = f"backup-{now.strftime('%Y%m%dT%H%M%SZ')}.json"
    fpath = os.path.join(backup_dir, fname)
    # gather snapshots
    try:
        data = {}
        # simple sets: products, persons, invoices, payments, ledger_entries
        data['products'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in session.query(models.Product).all() ]
        data['persons'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in session.query(models.Person).all() ]
        data['invoices'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in session.query(models.Invoice).all() ]
        data['invoice_items'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in session.query(models.InvoiceItem).all() ]
        data['payments'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in session.query(models.Payment).all() ]
        data['ledger_entries'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in session.query(models.LedgerEntry).all() ]
        # metadata counts
        meta = {k: len(v) for k, v in data.items()}
        payload = {'created_at': now.isoformat(), 'meta': meta, 'data': data}
        with open(fpath, 'w', encoding='utf-8') as fh:
            json.dump(payload, fh, ensure_ascii=False, default=str)
        size = os.path.getsize(fpath)
        # store meta counts in the `metadata` DB column; the ORM attribute is `metadata_json`
        bk = models.Backup(filename=fname, file_path=fpath, kind=kind, created_by=created_by, size_bytes=size, note=note, metadata_json=json.dumps(meta, ensure_ascii=False))
        session.add(bk)
        session.commit()
        session.refresh(bk)
        try:
            from .activity_logger import log_activity
            log_activity(session, None, f"ایجاد بکاپ {fname}", path=f"/api/backups/manual", method='POST', status_code=201, detail={'backup_id': bk.id})
        except Exception:
            pass
        return bk
    except Exception as e:
        # if file exists but failed to record, try to remove
        try:
            if os.path.exists(fpath):
                os.remove(fpath)
        except Exception:
            pass
        raise


def list_backups(session: Session, limit: int = 100):
    return session.query(models.Backup).order_by(models.Backup.created_at.desc()).limit(limit).all()


def get_backup(session: Session, backup_id: int):
    return session.query(models.Backup).filter(models.Backup.id == backup_id).first()


def create_financial_year(session: Session, name: str, start_date: str, end_date: Optional[str] = None):
    """Create new financial year record. start_date/end_date are ISO strings."""
    from datetime import datetime
    s = datetime.fromisoformat(start_date)
    e = None
    if end_date:
        try:
            e = datetime.fromisoformat(end_date)
        except Exception:
            e = None
    fy = models.FinancialYear(name=name, start_date=s, end_date=e)
    session.add(fy)
    session.commit()
    session.refresh(fy)
    return fy


def get_financial_years(session: Session):
    return session.query(models.FinancialYear).order_by(models.FinancialYear.start_date.desc()).all()


def close_financial_year(session: Session, fy_id: int, create_rollover: bool = True, closed_by: Optional[int] = None):
    """Close the financial year: compute account balances from ledger and create balancing entries moving net to RetainedEarnings.
    This is a simple implementation and should be reviewed for accounting correctness for production use.
    """
    import json
    from datetime import datetime
    fy = session.query(models.FinancialYear).filter(models.FinancialYear.id == fy_id).first()
    if not fy:
        return None
    if fy.is_closed:
        return fy
    # determine period end: use fy.end_date or now
    end = fy.end_date if fy.end_date else datetime.utcnow()
    # compute balances per account: debit - credit
    accounts = {}
    entries = session.query(models.LedgerEntry).filter(models.LedgerEntry.entry_date <= end).all()
    for e in entries:
        accounts.setdefault(e.debit_account, 0)
        accounts.setdefault(e.credit_account, 0)
        try:
            amt = int(e.amount or 0)
        except Exception:
            amt = 0
        accounts[e.debit_account] += amt
        accounts[e.credit_account] -= amt
    # create closing entries moving net to RetainedEarnings
    rollover = {}
    for acct, bal in accounts.items():
        if acct == 'RetainedEarnings' or bal == 0:
            continue
        # if positive balance (debit), credit the account and debit RetainedEarnings
        try:
            if bal > 0:
                create_ledger_entry(session, ref_type='closing', ref_id=str(fy.id), debit_account='RetainedEarnings', credit_account=acct, amount=int(bal), description=f'Closing {acct} for FY {fy.name}')
            else:
                # negative balance (credit), debit the account and credit RetainedEarnings
                create_ledger_entry(session, ref_type='closing', ref_id=str(fy.id), debit_account=acct, credit_account='RetainedEarnings', amount=int(abs(bal)), description=f'Closing {acct} for FY {fy.name}')
            rollover[acct] = int(bal)
        except Exception:
            pass
    # mark closed
    fy.is_closed = True
    fy.closed_at = datetime.utcnow()
    fy.opening_balances = json.dumps(rollover, ensure_ascii=False)
    session.add(fy)
    session.commit()
    session.refresh(fy)
    try:
        from .activity_logger import log_activity
        log_activity(session, None, f"بستن سال مالی {fy.name}", path=f"/api/financial-years/{fy.id}/close", method='POST', status_code=200, detail={'closed_by': closed_by})
    except Exception:
        pass
    return fy


def get_ledger_entries(session: Session, start: Optional[datetime] = None, end: Optional[datetime] = None, party_id: Optional[str] = None, ref_type: Optional[str] = None, limit: int = 200):
    qs = session.query(models.LedgerEntry).order_by(models.LedgerEntry.entry_date.desc())
    if start:
        qs = qs.filter(models.LedgerEntry.entry_date >= start)
    if end:
        qs = qs.filter(models.LedgerEntry.entry_date <= end)
    if party_id:
        qs = qs.filter(models.LedgerEntry.party_id == party_id)
    if ref_type:
        qs = qs.filter(models.LedgerEntry.ref_type == ref_type)
    return qs.limit(limit).all()


def report_pnl(session: Session, start: Optional[datetime] = None, end: Optional[datetime] = None):
    # Simple P&L: sum of finalized sales invoices minus finalized purchase invoices in range
    q = session.query(models.Invoice).filter(models.Invoice.status == 'final')
    if start:
        q = q.filter(models.Invoice.server_time >= start)
    if end:
        q = q.filter(models.Invoice.server_time <= end)
    sales = sum(i.total or 0 for i in q.filter(models.Invoice.invoice_type == 'sale').all())
    purchases = sum(i.total or 0 for i in q.filter(models.Invoice.invoice_type == 'purchase').all())
    gross = sales - purchases
    return {'start': start, 'end': end, 'sales': int(sales), 'purchases': int(purchases), 'gross_profit': int(gross)}


def report_person_turnover(session: Session, party_id: Optional[str] = None, party_name: Optional[str] = None, start: Optional[datetime] = None, end: Optional[datetime] = None):
    # Sum invoices and payments for a person
    inv_q = session.query(models.Invoice).filter(models.Invoice.status == 'final')
    pay_q = session.query(models.Payment).filter(models.Payment.status == 'posted')
    if start:
        inv_q = inv_q.filter(models.Invoice.server_time >= start)
        pay_q = pay_q.filter(models.Payment.server_time >= start)
    if end:
        inv_q = inv_q.filter(models.Invoice.server_time <= end)
        pay_q = pay_q.filter(models.Payment.server_time <= end)
    if party_id:
        inv_q = inv_q.filter(models.Invoice.party_id == party_id)
        pay_q = pay_q.filter(models.Payment.party_id == party_id)
    if party_name:
        inv_q = inv_q.filter(models.Invoice.party_name.ilike(f"%{party_name}%"))
        pay_q = pay_q.filter(models.Payment.party_name.ilike(f"%{party_name}%"))
    invoices_total = sum(i.total or 0 for i in inv_q.all())
    payments_total = sum(p.amount or 0 for p in pay_q.all())
    return {'party_id': party_id, 'party_name': party_name, 'invoices_total': int(invoices_total), 'payments_total': int(payments_total)}


def report_stock_valuation(session: Session):
    # For each product, compute inventory * last known price (from price history) as approximation
    out = []
    prods = session.query(models.Product).all()
    for p in prods:
        last_price = None
        ph = session.query(models.PriceHistory).filter(models.PriceHistory.product_id == p.id).order_by(models.PriceHistory.effective_at.desc()).first()
        if ph:
            last_price = ph.price
        total = (p.inventory or 0) * (last_price or 0)
        out.append({'product_id': p.id, 'name': p.name, 'inventory': int(p.inventory or 0), 'unit_price': int(last_price) if last_price else None, 'total_value': int(total)})
    return out


def report_cash_balance(session: Session, method: Optional[str] = None):
    q = session.query(models.Payment).filter(models.Payment.status == 'posted')
    if method:
        q = q.filter(models.Payment.method.ilike(f"%{method}%"))
    # balance = sum(in receipts) - sum(out payments)
    receipts = sum(p.amount or 0 for p in q.filter(models.Payment.direction == 'in').all())
    outs = sum(p.amount or 0 for p in q.filter(models.Payment.direction == 'out').all())
    return {'method': method or 'all', 'balance': int(receipts - outs)}


def dashboard_summary(session: Session):
    # counts: invoices today/7days/month
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_7 = now - timedelta(days=7)
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    invoices_today = session.query(models.Invoice).filter(models.Invoice.server_time >= start_today).count()
    invoices_7 = session.query(models.Invoice).filter(models.Invoice.server_time >= start_7).count()
    invoices_month = session.query(models.Invoice).filter(models.Invoice.server_time >= start_month).count()
    receipts_today = session.query(models.Payment).filter(models.Payment.direction == 'in', models.Payment.server_time >= start_today).all()
    payments_today = session.query(models.Payment).filter(models.Payment.direction == 'out', models.Payment.server_time >= start_today).all()
    receipts_total = sum(p.amount or 0 for p in receipts_today)
    payments_total = sum(p.amount or 0 for p in payments_today)
    net_today = receipts_total - payments_total
    # cash balances by method
    cash_balances = {}
    for m in ['cash', 'bank', 'pos']:
        cash_balances[m] = report_cash_balance(session, method=m).get('balance', 0)
    return {
        'invoices': {'today': invoices_today, '7days': invoices_7, 'month': invoices_month},
        'receipts_today': int(receipts_total),
        'payments_today': int(payments_total),
        'net_today': int(net_today),
        'cash_balances': cash_balances,
    }


def dashboard_sales_trends(session: Session, days: int = 30):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    invoices = session.query(models.Invoice).filter(models.Invoice.status == 'final', models.Invoice.server_time >= start).all()
    # bucket by day
    buckets = {}
    for i in range(days+1):
        d = (start + timedelta(days=i)).date().isoformat()
        buckets[d] = 0
    for inv in invoices:
        if inv.server_time:
            d = inv.server_time.date().isoformat()
            buckets.setdefault(d, 0)
            buckets[d] += int(inv.total or 0)
    series = [{'date': k, 'total': v} for k, v in sorted(buckets.items())]
    return {'days': days, 'series': series}


def dashboard_old_stock(session: Session, days: int = 90, min_qty: int = 1):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    out = []
    prods = session.query(models.Product).filter(models.Product.inventory >= min_qty).all()
    for p in prods:
        ph = session.query(models.PriceHistory).filter(models.PriceHistory.product_id == p.id).order_by(models.PriceHistory.effective_at.desc()).first()
        last_price_at = ph.effective_at if ph else None
        last_sale_at = None
        # attempt to find last sale date by invoice items linking — invoice items are not linked to product id currently
        # fallback: consider last_price_at
        last_activity = last_price_at
        if not last_activity or last_activity < cutoff:
            out.append({'product_id': p.id, 'name': p.name, 'inventory': int(p.inventory or 0), 'last_price_at': (last_price_at.isoformat() if last_price_at else None)})
    return out


def dashboard_checks_due(session: Session, within_days: int = 14):
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=within_days)
    pays = session.query(models.Payment).filter(models.Payment.due_date != None, models.Payment.due_date >= now, models.Payment.due_date <= end).all()
    out = []
    for p in pays:
        out.append({'id': p.id, 'payment_number': p.payment_number, 'party_name': p.party_name, 'amount': int(p.amount or 0), 'due_date': p.due_date.isoformat() if p.due_date else None, 'status': p.status})
    return out


def dashboard_currency_prices():
    # Query a couple of public endpoints with fallback
    from .cache import get_cache, set_cache
    cache_key = 'dashboard_currency_prices_v1'
    cached = get_cache(cache_key)
    if cached is not None:
        return cached
    res = {}
    try:
        # exchange rate (USD base)
        r = requests.get('https://api.exchangerate.host/latest?base=USD&symbols=EUR,IRR,USD', timeout=3)
        if r.status_code == 200:
            j = r.json()
            res['fx'] = j.get('rates')
        else:
            res['fx'] = None
    except Exception:
        res['fx'] = None
    try:
        # coin gecko price for BTC/ETH
        r = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', timeout=3)
        if r.status_code == 200:
            res['crypto'] = r.json()
        else:
            res['crypto'] = None
    except Exception:
        res['crypto'] = None
    # cache for 5 minutes by default
    set_cache(cache_key, res, ttl_seconds=300)
    return res


# ==================== User SMS Config CRUD ====================

def get_user_sms_config(session: Session, user_id: int) -> Optional[models.UserSmsConfig]:
    """دریافت تنظیمات SMS کاربر"""
    return session.query(models.UserSmsConfig).filter(models.UserSmsConfig.user_id == user_id).first()


def create_user_sms_config(session: Session, user_id: int, config: schemas.UserSmsConfigCreate) -> models.UserSmsConfig:
    """ایجاد تنظیمات SMS جدید برای کاربر"""
    encrypted_key = encrypt_value(config.api_key) if config.api_key else None
    sms_config = models.UserSmsConfig(
        user_id=user_id,
        provider=config.provider or 'ippanel',
        api_key=encrypted_key,
        sender_name=config.sender_name,
        enabled=config.enabled,
        auto_sms_enabled=config.auto_sms_enabled
    )
    session.add(sms_config)
    session.commit()
    session.refresh(sms_config)
    return sms_config


def update_user_sms_config(session: Session, user_id: int, config: schemas.UserSmsConfigUpdate) -> Optional[models.UserSmsConfig]:
    """به‌روز رسانی تنظیمات SMS کاربر"""
    sms_config = get_user_sms_config(session, user_id)
    if not sms_config:
        return None
    
    if config.api_key is not None:
        sms_config.api_key = encrypt_value(config.api_key)
    if config.sender_name is not None:
        sms_config.sender_name = config.sender_name
    if config.provider is not None:
        sms_config.provider = config.provider
    if config.enabled is not None:
        sms_config.enabled = config.enabled
    if config.auto_sms_enabled is not None:
        sms_config.auto_sms_enabled = config.auto_sms_enabled
    
    session.commit()
    session.refresh(sms_config)
    return sms_config


def delete_user_sms_config(session: Session, user_id: int) -> bool:
    """حذف تنظیمات SMS کاربر"""
    sms_config = get_user_sms_config(session, user_id)
    if sms_config:
        session.delete(sms_config)
        session.commit()
        return True
    return False


# ==================== User Preferences CRUD ====================

def get_user_preferences(session: Session, user_id: int) -> Optional[models.UserPreferences]:
    """دریافت تنظیمات کاربر"""
    return session.query(models.UserPreferences).filter(
        models.UserPreferences.user_id == user_id
    ).first()


def create_user_preferences(session: Session, user_id: int, 
                           language: str = 'fa', currency: str = 'irr',
                           auto_convert: bool = False) -> models.UserPreferences:
    """ایجاد تنظیمات کاربر جدید"""
    prefs = models.UserPreferences(
        user_id=user_id,
        language=language,
        currency=currency,
        auto_convert_currency=auto_convert
    )
    session.add(prefs)
    session.commit()
    session.refresh(prefs)
    return prefs


def update_user_preferences(session: Session, user_id: int, 
                           update: schemas.UserPreferencesUpdate) -> Optional[models.UserPreferences]:
    """به‌روزرسانی تنظیمات کاربر"""
    prefs = get_user_preferences(session, user_id)
    if not prefs:
        return None
    
    if update.language is not None:
        prefs.language = update.language
    if update.currency is not None:
        prefs.currency = update.currency
    if update.auto_convert_currency is not None:
        prefs.auto_convert_currency = update.auto_convert_currency
    if update.theme_preference is not None:
        prefs.theme_preference = update.theme_preference
    
    session.commit()
    session.refresh(prefs)
    return prefs


# ==================== Device Login CRUD ====================

def get_or_create_device_login(session: Session, user_id: int, device_id: str,
                               ip_address: Optional[str] = None,
                               user_agent: Optional[str] = None) -> models.DeviceLogin:
    """دریافت یا ایجاد device login"""
    device = session.query(models.DeviceLogin).filter(
        models.DeviceLogin.user_id == user_id,
        models.DeviceLogin.device_id == device_id,
        models.DeviceLogin.is_active == True
    ).first()
    
    if device:
        return device
    
    # Create new device login
    device = models.DeviceLogin(
        user_id=user_id,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True
    )
    session.add(device)
    session.commit()
    session.refresh(device)
    return device


def get_user_active_devices(session: Session, user_id: int) -> list[models.DeviceLogin]:
    """دریافت دستگاه‌های فعال کاربر"""
    return session.query(models.DeviceLogin).filter(
        models.DeviceLogin.user_id == user_id,
        models.DeviceLogin.is_active == True
    ).all()


def get_device_login(session: Session, device_id: int) -> Optional[models.DeviceLogin]:
    """دریافت device login"""
    return session.query(models.DeviceLogin).filter(
        models.DeviceLogin.id == device_id
    ).first()


def logout_device(session: Session, device_id: int) -> bool:
    """خروج از دستگاه"""
    device = get_device_login(session, device_id)
    if not device:
        return False
    
    device.is_active = False
    device.logout_at = func.now()
    session.commit()
    return True


def increment_otp_attempt(session: Session, device_id: int) -> models.DeviceLogin:
    """افزایش تلاش‌های OTP"""
    device = get_device_login(session, device_id)
    if device:
        device.otp_attempts += 1
        device.otp_failed_count += 1
        
        # Lock after 3 failed attempts for 1 hour
        if device.otp_failed_count >= 3:
            device.otp_locked_until = func.now() + timedelta(hours=1)
        
        session.commit()
        session.refresh(device)
    
    return device


def reset_otp_attempts(session: Session, device_id: int) -> models.DeviceLogin:
    """بازنشانی تلاش‌های OTP پس از تأیید موفق"""
    device = get_device_login(session, device_id)
    if device:
        device.otp_failed_count = 0
        device.otp_locked_until = None
        session.commit()
        session.refresh(device)
    
    return device


def is_device_otp_locked(session: Session, device_id: int) -> bool:
    """بررسی اینکه آیا دستگاه برای OTP قفل است"""
    device = get_device_login(session, device_id)
    if not device or not device.otp_locked_until:
        return False
    
    # Check if lockout has expired
    if datetime.now(timezone.utc) > device.otp_locked_until:
        device.otp_locked_until = None
        session.commit()
        return False
    
    return True


# ==================== Developer API Keys CRUD ====================

def generate_api_key() -> str:
    """تولید کلید API جدید (32 کاراکتر)"""
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    """SHA256 hash کردن کلید API برای جستجو"""
    return hashlib.sha256(api_key.encode()).hexdigest()


def create_api_key(session: Session, user_id: int, 
                   payload: schemas.DeveloperApiKeyCreate) -> Tuple[models.DeveloperApiKey, str]:
    """ایجاد کلید API جدید. برمی‌گرداند (model, plain_key)"""
    plain_key = generate_api_key()
    encrypted_key = encrypt_value(plain_key)
    key_hash = hash_api_key(plain_key)
    
    endpoints_json = json.dumps(payload.endpoints) if payload.endpoints else None
    
    api_key = models.DeveloperApiKey(
        user_id=user_id,
        api_key=encrypted_key,
        api_key_hash=key_hash,
        name=payload.name,
        description=payload.description,
        rate_limit_per_minute=payload.rate_limit_per_minute,
        endpoints=endpoints_json,
        enabled=True
    )
    session.add(api_key)
    session.commit()
    session.refresh(api_key)
    
    return api_key, plain_key


def get_api_key_by_hash(session: Session, key_hash: str) -> Optional[models.DeveloperApiKey]:
    """دریافت کلید API با استفاده از hash"""
    return session.query(models.DeveloperApiKey).filter(
        models.DeveloperApiKey.api_key_hash == key_hash,
        models.DeveloperApiKey.enabled == True,
        models.DeveloperApiKey.revoked_at.is_(None)
    ).first()


def get_user_api_keys(session: Session, user_id: int) -> List[models.DeveloperApiKey]:
    """دریافت تمام کلیدهای API کاربر"""
    return session.query(models.DeveloperApiKey).filter(
        models.DeveloperApiKey.user_id == user_id
    ).order_by(models.DeveloperApiKey.created_at.desc()).all()


def get_api_key(session: Session, key_id: int) -> Optional[models.DeveloperApiKey]:
    """دریافت کلید API"""
    return session.query(models.DeveloperApiKey).filter(
        models.DeveloperApiKey.id == key_id
    ).first()


def update_api_key(session: Session, key_id: int, 
                   update: schemas.DeveloperApiKeyUpdate) -> Optional[models.DeveloperApiKey]:
    """به‌روزرسانی کلید API"""
    api_key = get_api_key(session, key_id)
    if not api_key:
        return None
    
    if update.name is not None:
        api_key.name = update.name
    if update.description is not None:
        api_key.description = update.description
    if update.enabled is not None:
        api_key.enabled = update.enabled
    if update.rate_limit_per_minute is not None:
        api_key.rate_limit_per_minute = update.rate_limit_per_minute
    if update.endpoints is not None:
        api_key.endpoints = json.dumps(update.endpoints) if update.endpoints else None
    
    session.commit()
    session.refresh(api_key)
    return api_key


def rotate_api_key(session: Session, old_key_id: int) -> Tuple[models.DeveloperApiKey, str]:
    """تولید کلید API جدید. برمی‌گرداند (new_model, plain_new_key)"""
    old_key = get_api_key(session, old_key_id)
    if not old_key:
        raise ValueError('کلید API یافت نشد')
    
    # Revoke old key
    old_key.revoked_at = func.now()
    session.commit()
    
    # Create new key with same settings
    payload = schemas.DeveloperApiKeyCreate(
        name=old_key.name,
        description=old_key.description,
        rate_limit_per_minute=old_key.rate_limit_per_minute,
        endpoints=json.loads(old_key.endpoints) if old_key.endpoints else None
    )
    
    new_key, plain_key = create_api_key(session, old_key.user_id, payload)
    return new_key, plain_key


def revoke_api_key(session: Session, key_id: int) -> bool:
    """لغو کلید API"""
    api_key = get_api_key(session, key_id)
    if not api_key:
        return False
    
    api_key.revoked_at = func.now()
    session.commit()
    return True


def update_api_key_last_used(session: Session, key_id: int) -> None:
    """به‌روزرسانی زمان آخرین استفاده"""
    api_key = get_api_key(session, key_id)
    if api_key:
        api_key.last_used_at = func.now()
        session.commit()

