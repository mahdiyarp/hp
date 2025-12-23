from . import models, schemas
import secrets
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple
from sqlalchemy.sql import func
from datetime import datetime, timezone
from datetime import timedelta
from collections import Counter
import jdatetime
import requests
import math
from .schemas import ProductCreate, ProductOut, PersonCreate
from .normalizer import normalize_for_search
import hashlib
import json
from . import search as search_client
from .security import encrypt_value
# ==================== Person Sync Notifier (Stub) ====================

def notify_person_sync(person_id: str, changes: dict):
    """
    Publish a sync message to Redis and POST to webhook if configured.
    Soft-fail on missing modules or network errors to keep tests deterministic.
    """
    try:
        import os
        redis_url = os.getenv('REDIS_URL')
        webhook = os.getenv('PERSON_SYNC_WEBHOOK')
        if redis_url:
            try:
                import redis  # type: ignore
                r = redis.from_url(redis_url)
                r.publish('person_sync', f"{person_id}:{changes}")
            except Exception:
                pass
        if webhook:
            try:
                import requests  # type: ignore
                requests.post(webhook, json={'person_id': person_id, 'changes': changes})
            except Exception:
                pass
    except Exception:
        pass


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


# ==================== Safe Person Basic Loader ====================

def get_person_basic(session: Session, person_id: str) -> Optional[dict]:
    """Load minimal person fields safely without selecting newly-added columns.
    Returns dict with keys: id, name, kind, mobile, code
    """
    from sqlalchemy import text
    sql = text(
        """
        SELECT id, name, kind, mobile, code
        FROM persons
        WHERE id = :pid
        LIMIT 1
        """
    )
    row = session.execute(sql, { 'pid': person_id }).mappings().first()
    return dict(row) if row else None


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
    # Resolve desired role either by id or by provided role name
    role_id = user.role_id
    role_name = user.role
    role_obj = None
    if role_id:
        role_obj = session.query(models.Role).filter(models.Role.id == role_id).first()
        if not role_obj:
            raise ValueError('Role not found')
    elif user.role:
        role_obj = session.query(models.Role).filter(func.lower(models.Role.name) == user.role.lower()).first()
        if not role_obj:
            raise ValueError('Role not found')
    if role_obj:
        role_id = role_obj.id
        role_name = role_obj.name
    else:
        viewer_role = session.query(models.Role).filter(models.Role.name == 'Viewer').first()
        if viewer_role:
            role_id = viewer_role.id
            role_name = viewer_role.name
        else:
            role_id = 5  # Default fallback
            role_name = 'Viewer'

    db_user = models.User(
        username=username_norm,
        email=user.email,
        full_name=user.full_name,
        mobile=user.mobile,
        hashed_password=get_password_hash(user.password),
        role=role_name or 'User',  # Legacy field for compatibility
        role_id=role_id,
        is_active=True,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


# ==================== NFT Assets ====================

def create_nft_asset(session: Session, owner_user_id: Optional[int], token_id: str, chain: str = 'hesabpak', contract_address: Optional[str] = None, metadata: Optional[dict] = None) -> models.NftAsset:
    existing = session.query(models.NftAsset).filter(models.NftAsset.token_id == token_id).first()
    if existing:
        return existing
    asset = models.NftAsset(
        token_id=token_id,
        chain=chain,
        contract_address=contract_address,
        metadata_json=metadata or {},
        owner_user_id=owner_user_id,
        is_active=True
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


def get_user_nft_assets(session: Session, user_id: int) -> List[models.NftAsset]:
    return session.query(models.NftAsset).filter(models.NftAsset.owner_user_id == user_id, models.NftAsset.is_active == True).all()


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
    from datetime import datetime, timezone
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
            ph = models.PriceHistory(product_id=prod.id, price=int(price), type='sell', effective_at=datetime.now(timezone.utc))
            session.add(ph)
            session.commit()
    except Exception:
        pass
    return prod


def get_products(session: Session, q: Optional[str] = None, limit: int = 50):
    from sqlalchemy import func, desc
    
    qs = session.query(models.Product)
    if q:
        qn = normalize_for_search(q)
        qs = qs.filter(models.Product.name_norm.contains(qn))
    
    products = qs.limit(limit).all()
    
    # Enrich with pricing information
    for product in products:
        # آخرین قیمت خرید
        last_purchase = session.query(models.InvoiceItem).join(
            models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id
        ).filter(
            models.InvoiceItem.product_id == product.id,
            models.Invoice.invoice_type == 'purchase',
            models.Invoice.status == 'final'
        ).order_by(desc(models.Invoice.server_time)).first()
        product.last_purchase_price = last_purchase.unit_price if last_purchase else None
        
        # میانگین قیمت خرید
        avg_purchase = session.query(func.avg(models.InvoiceItem.unit_price)).join(
            models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id
        ).filter(
            models.InvoiceItem.product_id == product.id,
            models.Invoice.invoice_type == 'purchase',
            models.Invoice.status == 'final'
        ).scalar()
        product.avg_purchase_price = int(avg_purchase) if avg_purchase else None
        
        # آخرین قیمت فروش
        last_sale = session.query(models.InvoiceItem).join(
            models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id
        ).filter(
            models.InvoiceItem.product_id == product.id,
            models.Invoice.invoice_type == 'sale',
            models.Invoice.status == 'final'
        ).order_by(desc(models.Invoice.server_time)).first()
        product.last_sale_price = last_sale.unit_price if last_sale else None
        
        # میانگین قیمت فروش
        avg_sale = session.query(func.avg(models.InvoiceItem.unit_price)).join(
            models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id
        ).filter(
            models.InvoiceItem.product_id == product.id,
            models.Invoice.invoice_type == 'sale',
            models.Invoice.status == 'final'
        ).scalar()
        product.avg_sale_price = int(avg_sale) if avg_sale else None
    
    return products


def create_person(session: Session, p: PersonCreate) -> models.Person:
    norm = normalize_for_search(p.name)
    raw = {"name": p.name, "kind": p.kind or '', "mobile": p.mobile or '', "created_at": str(func.now())}
    pid = make_hash_id(raw)
    person = models.Person(
        id=pid,
        name=p.name,
        name_norm=norm,
        kind=p.kind,
        mobile=p.mobile,
        description=p.description,
        code=p.code or '',
        tax_id=p.tax_id,
        national_id=p.national_id,
        address=p.address,
        payment_terms=p.payment_terms,
        credit_limit=p.credit_limit,
    )
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
    """Safely fetch persons even if some columns aren't migrated yet.

    Uses a raw SELECT over known baseline columns to avoid selecting
    non-existent columns in environments where Alembic migrations
    haven't applied the new fields yet.
    """
    from sqlalchemy import text
    base_cols = "id, name, name_norm, code, kind, mobile, description, created_at"
    sql = f"SELECT {base_cols} FROM persons"
    params = {}
    if q:
        # naive filter over name_norm using LIKE
        sql += " WHERE name_norm LIKE :q"
        params['q'] = f"%{normalize_for_search(q)}%"
    sql += " LIMIT :limit"
    params['limit'] = int(limit or 50)
    rows = session.execute(text(sql), params).mappings().all()
    persons = []
    for r in rows:
        persons.append(models.Person(
            id=r['id'],
            name=r['name'],
            name_norm=r['name_norm'],
            code=r.get('code'),
            kind=r.get('kind'),
            mobile=r.get('mobile'),
            description=r.get('description'),
            created_at=r.get('created_at'),
        ))
    return persons

def get_person(session: Session, person_id: str) -> Optional[models.Person]:
    return session.query(models.Person).filter(models.Person.id == person_id).first()

def update_person(session: Session, person_id: str, p: PersonCreate) -> Optional[models.Person]:
    person = get_person(session, person_id)
    if not person:
        return None
    person.name = p.name
    person.name_norm = normalize_for_search(p.name)
    person.kind = p.kind
    person.mobile = p.mobile
    person.code = p.code or person.code
    person.description = p.description
    person.tax_id = p.tax_id
    person.national_id = p.national_id
    person.address = p.address
    person.payment_terms = p.payment_terms
    person.credit_limit = p.credit_limit
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
    return person

def delete_person(session: Session, person_id: str) -> bool:
    person = get_person(session, person_id)
    if not person:
        return False
    session.delete(person)
    session.commit()
    return True

def get_person_balances(session: Session, start: datetime | None = None, end: datetime | None = None):
    """محاسبه مانده اشخاص از دفترکل.

    مانده‌ها بر اساس حساب‌های "AccountsReceivable" و "AccountsPayable" محاسبه می‌شوند.
    Receivable = مجموع بدهکار AR − مجموع بستانکار AR
    Payable   = مجموع بستانکار AP − مجموع بدهکار AP
    Balance   = Receivable − Payable
    """
    from sqlalchemy import text

    people = session.execute(text("SELECT id, name, kind, mobile, code FROM persons ORDER BY id"))
    people = people.mappings().all()

    # Optionally filter by date range
    date_filter = ""
    params = {}
    if start:
        date_filter += " AND entry_date >= :start"
        params['start'] = start
    if end:
        date_filter += " AND entry_date <= :end"
        params['end'] = end

    ar_rows = session.execute(text(
        """
        SELECT party_id,
               COALESCE(SUM(CASE WHEN debit_account = 'AccountsReceivable' THEN amount ELSE 0 END),0) AS debit,
               COALESCE(SUM(CASE WHEN credit_account = 'AccountsReceivable' THEN amount ELSE 0 END),0) AS credit
        FROM ledger_entries
        WHERE 1=1
        """ + date_filter + """
        GROUP BY party_id
        """
    ), params).mappings().all()

    ap_rows = session.execute(text(
        """
        SELECT party_id,
               COALESCE(SUM(CASE WHEN debit_account = 'AccountsPayable' THEN amount ELSE 0 END),0) AS debit,
               COALESCE(SUM(CASE WHEN credit_account = 'AccountsPayable' THEN amount ELSE 0 END),0) AS credit
        FROM ledger_entries
        WHERE 1=1
        """ + date_filter + """
        GROUP BY party_id
        """
    ), params).mappings().all()

    ar_map = {r['party_id']: {'debit': r['debit'], 'credit': r['credit']} for r in ar_rows}
    ap_map = {r['party_id']: {'debit': r['debit'], 'credit': r['credit']} for r in ap_rows}

    results = []
    for p in people:
        pid = p['id']
        ar_debit = (ar_map.get(pid, {}).get('debit') or 0)
        ar_credit = (ar_map.get(pid, {}).get('credit') or 0)
        ap_debit = (ap_map.get(pid, {}).get('debit') or 0)
        ap_credit = (ap_map.get(pid, {}).get('credit') or 0)

        receivable = ar_debit - ar_credit
        payable = ap_credit - ap_debit
        balance = receivable - payable

        results.append({
            'person_id': pid,
            'name': p['name'],
            'kind': p.get('kind'),
            'mobile': p.get('mobile'),
            'code': p.get('code'),
            'receivable': float(receivable),
            'payable': float(payable),
            'balance': float(balance),
        })

    return results


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


def create_user_with_role(
    session: Session,
    username: str,
    password: str,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    mobile: Optional[str] = None,
    role_id: Optional[int] = None,
) -> models.User:
    from .security import get_password_hash

    role_name = 'Viewer'
    assigned_role_id = role_id
    if role_id:
        role = session.query(models.Role).filter(models.Role.id == role_id).first()
        if not role:
            raise ValueError('نقش انتخابی یافت نشد')
        role_name = role.name
        assigned_role_id = role.id

    user = models.User(
        username=username,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        email=email,
        mobile=mobile,
        role=role_name,
        role_id=assigned_role_id,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
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
    now = datetime.now(timezone.utc)
    prefix = invoice_type[:1].upper() if invoice_type else 'I'
    return f"{prefix}{now.year:04d}{now.month:02d}{now.day:02d}"


def create_invoice_manual(session: Session, inv: schemas.InvoiceCreate) -> models.Invoice:
    # create invoice record without invoice_number, then set number using id
    server_time = datetime.now(timezone.utc)
    from .invoice_logic import coerce_datetime, compute_totals, LineSpec
    client_time = coerce_datetime(inv.client_time, calendar=inv.client_calendar or 'jalali') or server_time
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
    lines = []
    for it in inv.items:
        total = int(it.unit_price) * int(it.quantity)
        ii = models.InvoiceItem(
            invoice_id=invoice.id,
            description=it.description,
            quantity=int(it.quantity),
            unit=it.unit,
            unit_price=int(it.unit_price),
            total=total,
            product_id=it.product_id,
        )
        session.add(ii)
        lines.append(LineSpec(quantity=int(it.quantity), unit_price=int(it.unit_price), discount=int(getattr(it, 'discount', 0) or 0)))
    totals = compute_totals(lines, invoice_discount=int(inv.discount_total or 0), tax_rate=int(inv.tax_rate or 0))
    invoice.subtotal = totals.subtotal
    invoice.tax = totals.tax_amount
    invoice.total = totals.total
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

    # Coerce client_time strings into datetime where applicable
    try:
        ct = data.get('client_time')
        if isinstance(ct, str) and ct:
            cal = (data.get('client_calendar') or getattr(inv, 'client_calendar', None))
            from datetime import datetime, timezone
            dt_val = None
            if cal == 'jalali':
                try:
                    parts = ct.replace('-', '/').split('/')
                    jy, jm, jd = int(parts[0]), int(parts[1]), int(parts[2])
                    jdt = jdatetime.date(jy, jm, jd).togregorian()
                    dt_val = datetime(jdt.year, jdt.month, jdt.day, tzinfo=timezone.utc)
                except Exception:
                    dt_val = None
            else:
                # Try ISO-like formats
                try:
                    dt_val = datetime.fromisoformat(ct)
                    if dt_val.tzinfo is None:
                        dt_val = dt_val.replace(tzinfo=timezone.utc)
                except Exception:
                    dt_val = None
            if dt_val is not None:
                data['client_time'] = dt_val
    except Exception:
        # best-effort conversion; continue if any parsing fails
        pass

    for k, v in data.items():
        if hasattr(inv, k):
            setattr(inv, k, v)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    # attach items for response compatibility
    try:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
    except Exception:
        pass
    return inv


def finalize_invoice(session: Session, invoice_id: int, client_time: Optional[datetime] = None):
    inv = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None

    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice_id).all()

    # Validate sale invoices against available inventory before changing status
    if inv.invoice_type == 'sale':
        product_requirements = Counter()
        for item in items:
            if item.product_id:
                product_requirements[item.product_id] += int(item.quantity or 0)
        if product_requirements:
            product_rows = session.query(models.Product).filter(models.Product.id.in_(product_requirements.keys())).all()
            product_map = {p.id: p for p in product_rows}
            insufficient = []
            for pid, needed in product_requirements.items():
                product = product_map.get(pid)
                available = int(product.inventory or 0) if product else 0
                if available < needed:
                    insufficient.append({
                        'name': product.name if product else f'ID {pid}',
                        'required': needed,
                        'available': available,
                    })
            if insufficient:
                details = '، '.join(
                    f"«{entry['name']}»: نیاز {entry['required']} / موجود {entry['available']}"
                    for entry in insufficient
                )
                raise ValueError(f'موجودی کافی برای کالاهای زیر وجود ندارد: {details}')

    inv.status = 'final'
    if client_time:
        inv.client_time = client_time
    inv.server_time = datetime.now(timezone.utc)
    session.add(inv)

    price_history_entries = []
    product_map: dict[str, models.Product] = {}
    product_ids = {item.product_id for item in items if item.product_id}
    if product_ids:
        product_rows = session.query(models.Product).filter(models.Product.id.in_(product_ids)).all()
        product_map = {p.id: p for p in product_rows}

    for item in items:
        if not item.product_id:
            continue
        product = product_map.get(item.product_id)
        if not product:
            continue
        history_type = None
        if inv.invoice_type == 'sale':
            product.inventory = int(product.inventory or 0) - int(item.quantity or 0)
            history_type = 'sell'
        elif inv.invoice_type == 'purchase':
            product.inventory = int(product.inventory or 0) + int(item.quantity or 0)
            history_type = 'buy'
        session.add(product)
        if history_type and item.unit_price is not None:
            price_history_entries.append(models.PriceHistory(
                product_id=item.product_id,
                price=int(item.unit_price),
                type=history_type,
                effective_at=datetime.now(timezone.utc),
            ))

    if price_history_entries:
        session.add_all(price_history_entries)

    try:
        session.commit()
    except ValueError:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        print(f"Finalize invoice error: {e}")
        raise

    session.refresh(inv)

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


def duplicate_invoice(session: Session, invoice_id: int) -> Optional[models.Invoice]:
    """Create a draft duplicate of an existing invoice with copied items."""
    src = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not src:
        return None
    dup = models.Invoice(
        invoice_type=src.invoice_type,
        mode=src.mode,
        party_id=src.party_id,
        party_name=src.party_name,
        client_time=src.client_time,
        status='draft',
        subtotal=src.subtotal,
        tax=src.tax,
        total=src.total,
        note=src.note,
    )
    session.add(dup)
    session.commit()
    session.refresh(dup)
    # copy items
    src_items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == src.id).all()
    for it in src_items:
        ii = models.InvoiceItem(
            invoice_id=dup.id,
            description=it.description,
            quantity=int(it.quantity),
            unit=it.unit,
            unit_price=int(it.unit_price),
            total=int(it.total or (int(it.quantity) * int(it.unit_price))),
            product_id=it.product_id,
        )
        session.add(ii)
    session.commit()
    # attach items for response
    dup.items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == dup.id).all()
    return dup


def _generate_payment_number(session: Session, direction: str) -> str:
    now = datetime.now(timezone.utc)
    prefix = 'R' if direction == 'in' else 'P'
    return f"{prefix}{now.year:04d}{now.month:02d}{now.day:02d}"


def create_payment_manual(session: Session, p: schemas.PaymentCreate) -> models.Payment:
    server_time = datetime.now(timezone.utc)
    client_time = p.client_time or server_time
    # Coerce due_date if provided as string
    due_dt = None
    try:
        if isinstance(p.due_date, str) and p.due_date:
            from .invoice_logic import coerce_datetime
            due_dt = coerce_datetime(p.due_date, calendar=p.client_calendar or 'jalali')
    except Exception:
        due_dt = None
    
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
        due_date=due_dt,
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

    # Create ledger entries for payment to impact AccountsReceivable
    try:
        # For receipts (direction 'in'): Debit Cash/Bank, Credit AccountsReceivable
        # For outgoing payments (direction 'out'): Debit AccountsPayable or Expense, Credit Cash/Bank
        if pay.direction == 'in':
            debit_acc = 'Cash'
            credit_acc = 'AccountsReceivable'
        else:
            debit_acc = 'AccountsPayable'
            credit_acc = 'Cash'
        le = models.LedgerEntry(
            ref_type='payment',
            ref_id=str(pay.id),
            entry_date=pay.client_time or pay.server_time,
            debit_account=debit_acc,
            credit_account=credit_acc,
            amount=pay.amount,
            party_id=pay.party_id,
            party_name=pay.party_name,
            description=f"Payment {pay.payment_number} ({pay.method or 'cash'})",
            tracking_code=pay.tracking_code,
        )
        session.add(le)
        session.commit()
    except Exception as e:
        print(f"Ledger creation error (payment): {e}")
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
    
    # Create ledger entry depending on direction/method (table-driven when available)
    try:
        # Try to use dynamic payment method mapping
        acct_name = None
        if getattr(models, 'PaymentMethod', None) is not None and pay.method:
            try:
                m = session.query(models.PaymentMethod).filter(models.PaymentMethod.key == pay.method).first()
                if m and m.account:
                    acct_name = m.account
            except Exception:
                acct_name = None
        if not acct_name:
            # Fallback heuristic based on legacy method strings
            acct_name = 'Cash' if (not pay.method or (pay.method or '').lower()=='cash') else ('Bank' if 'bank' in (pay.method or '').lower() else ('POS' if 'pos' in (pay.method or '').lower() else 'Cash'))

        if pay.direction == 'in':
            # receipt: debit MethodAccount, credit AccountsReceivable
            create_ledger_entry(session,
                                ref_type='payment',
                                ref_id=str(pay.id),
                                debit_account=acct_name,
                                credit_account='AccountsReceivable',
                                amount=int(pay.amount or 0),
                                party_id=pay.party_id,
                                party_name=pay.party_name,
                                description=f'Receipt {pay.payment_number}',
                                tracking_code=pay.tracking_code)
        else:
            # payment out: debit Expenses (simple), credit MethodAccount
            create_ledger_entry(session,
                                ref_type='payment',
                                ref_id=str(pay.id),
                                debit_account='Expenses',
                                credit_account=acct_name,
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
    # Automation hooks
    try:
        from .services.automation import trigger_event as _trigger
        _trigger(session, 'payment.posted', {
            'id': pay.id,
            'payment_number': pay.payment_number,
            'party_id': pay.party_id,
            'party_name': pay.party_name,
            'amount': int(pay.amount or 0),
        })
    except Exception:
        pass
    
    return pay


# ==================== Payment Methods CRUD ====================

def get_payment_methods(session: Session) -> List[models.PaymentMethod]:
    return session.query(models.PaymentMethod).order_by(models.PaymentMethod.order.asc(), models.PaymentMethod.id.asc()).all()


def get_payment_method(session: Session, pm_id: int) -> Optional[models.PaymentMethod]:
    return session.query(models.PaymentMethod).filter(models.PaymentMethod.id == pm_id).first()


def get_payment_method_by_key(session: Session, key: str) -> Optional[models.PaymentMethod]:
    return session.query(models.PaymentMethod).filter(models.PaymentMethod.key == key).first()


def create_payment_method(session: Session, payload: 'schemas.PaymentMethodCreate') -> models.PaymentMethod:
    existing = get_payment_method_by_key(session, payload.key)
    if existing:
        raise ValueError('payment method key already exists')
    pm = models.PaymentMethod(
        key=payload.key,
        name=payload.name,
        parent_id=payload.parent_id,
        enabled=bool(payload.enabled) if payload.enabled is not None else True,
        order=int(payload.order or 0),
        account=payload.account,
        is_cheque=bool(payload.is_cheque) if payload.is_cheque is not None else False,
        config=payload.config,
    )
    session.add(pm)
    session.commit()
    session.refresh(pm)
    return pm


def update_payment_method(session: Session, pm_id: int, payload: 'schemas.PaymentMethodUpdate') -> Optional[models.PaymentMethod]:
    pm = get_payment_method(session, pm_id)
    if not pm:
        return None
    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        if hasattr(pm, k):
            setattr(pm, k, v)
    session.add(pm)
    session.commit()
    session.refresh(pm)
    return pm


def delete_payment_method(session: Session, pm_id: int) -> bool:
    pm = get_payment_method(session, pm_id)
    if not pm:
        return False
    session.delete(pm)
    session.commit()
    return True


def create_ledger_entry(session: Session, ref_type: Optional[str], ref_id: Optional[str], debit_account: str, credit_account: str, amount: int, party_id: Optional[str] = None, party_name: Optional[str] = None, description: Optional[str] = None, tracking_code: Optional[str] = None, entry_date: Optional[datetime] = None) -> models.LedgerEntry:
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
    if entry_date is not None:
        try:
            le.entry_date = entry_date
        except Exception:
            pass
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
    rep.reviewed_at = datetime.now(timezone.utc)
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
    now = datetime.now(timezone.utc)
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
    end = fy.end_date if fy.end_date else datetime.now(timezone.utc)
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
    fy.closed_at = datetime.now(timezone.utc)
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
    try:
        q = session.query(models.Invoice).filter(models.Invoice.status == 'final')
        if start:
            q = q.filter(models.Invoice.server_time >= start)
        if end:
            q = q.filter(models.Invoice.server_time <= end)
        sales = sum(i.total or 0 for i in q.filter(models.Invoice.invoice_type == 'sale').all())
        purchases = sum(i.total or 0 for i in q.filter(models.Invoice.invoice_type == 'purchase').all())
        gross = sales - purchases
        return {'start': start, 'end': end, 'sales': int(sales), 'purchases': int(purchases), 'gross_profit': int(gross)}
    except Exception:
        # When tables are missing (e.g., fresh test DB), return empty structure
        return {'start': start, 'end': end, 'sales': 0, 'purchases': 0, 'gross_profit': 0}


def report_pnl_with_cost(session: Session, start: Optional[datetime] = None, end: Optional[datetime] = None, method: str = 'FIFO'):
    """Compute P&L with COGS using FIFO/LIFO layers.
    Revenue is sum of finalized sales within [start,end]. COGS is derived by consuming purchase layers according to method.
    Sales before the start reduce layers without impacting period revenue/COGS. Purchases up to end add to layers.
    """
    method = (method or 'FIFO').upper()
    if method not in ('FIFO', 'LIFO'):
        method = 'FIFO'
    # Normalize datetime awareness to avoid naive/aware comparison errors
    def _aware(dt: Optional[datetime]) -> Optional[datetime]:
        if dt is None:
            return None
        try:
            return dt if getattr(dt, 'tzinfo', None) is not None else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return dt
    start = _aware(start)
    end = _aware(end)
    # Fetch all finalized invoices to build layers. We will constrain by [start,end]
    # when accumulating revenue/COGS to avoid timezone boundary issues.
    try:
        inv_q = session.query(models.Invoice).filter(models.Invoice.status == 'final')
        invs = inv_q.all()
        if not invs:
            return {'start': start, 'end': end, 'sales': 0, 'cogs': 0, 'gross_profit': 0, 'method': method}
    except Exception:
        return {'start': start, 'end': end, 'sales': 0, 'cogs': 0, 'gross_profit': 0, 'method': method}
    # Load items in bulk via join to be robust across SQLite/Postgres
    try:
        items = (
            session.query(models.InvoiceItem, models.Invoice)
            .join(models.Invoice, models.Invoice.id == models.InvoiceItem.invoice_id)
            .filter(models.Invoice.status == 'final')
            .all()
        )
        # normalize to just InvoiceItem instances but keep invoice time/type via a dict
        inv_meta = {}
        for it, inv in items:
            inv_meta[it.id] = {'t': inv.server_time or inv.client_time, 'type': inv.invoice_type}
        items = [it for it, _ in items]
    except Exception:
        items = []
        inv_meta = {}
    items_by_inv = {}
    for it in items:
        items_by_inv.setdefault(it.invoice_id, []).append(it)
    # Compose events per product
    by_product: dict[str, list] = {}
    for inv in invs:
        t = inv.server_time or inv.client_time
        t = _aware(t)
        if not t:
            continue
        its = items_by_inv.get(inv.id, [])
        for it in its:
            if not it.product_id:
                continue
            by_product.setdefault(it.product_id, []).append({
                't': t,
                'type': inv.invoice_type,
                'qty': int(it.quantity or 0),
                'unit': int(it.unit_price or 0),
                'total': int(it.total or 0),
            })
    # Fallback: if no by_product built (e.g., items_by_inv empty due to driver quirks),
    # use joined items metadata when available
    if not by_product and items:
        for it in items:
            pid = getattr(it, 'product_id', None)
            if not pid:
                continue
            meta = inv_meta.get(getattr(it, 'id', None)) if 'inv_meta' in locals() else None
            t = _aware((meta or {}).get('t')) if isinstance(meta, dict) else None
            ttype = (meta or {}).get('type') if isinstance(meta, dict) else None
            if not t or not ttype:
                continue
            by_product.setdefault(pid, []).append({
                't': t,
                'type': ttype,
                'qty': int(getattr(it, 'quantity', 0) or 0),
                'unit': int(getattr(it, 'unit_price', 0) or 0),
                'total': int(getattr(it, 'total', 0) or 0),
            })
    total_revenue = 0
    total_cogs = 0
    for pid, evs in by_product.items():
        evs.sort(key=lambda x: x['t'])
        layers: list[dict] = []
        last_cost = 0
        def take(need: int) -> int:
            nonlocal layers, last_cost
            taken = 0
            while need > 0:
                idx = 0 if method == 'FIFO' else (len(layers) - 1)
                if idx < 0 or idx >= len(layers):
                    taken += need * last_cost
                    need = 0
                    break
                layer = layers[idx]
                use = min(need, layer['qty'])
                taken += use * layer['cost']
                layer['qty'] -= use
                need -= use
                if layer['qty'] <= 0:
                    layers.pop(idx)
            return taken
        for e in evs:
            if e['type'] == 'purchase':
                layers.append({'qty': e['qty'], 'cost': e['unit']})
                last_cost = e['unit'] or last_cost
            elif e['type'] == 'sale':
                in_range = True
                t_ev = _aware(e['t'])
                if start and t_ev and t_ev < start:
                    in_range = False
                if end and t_ev and t_ev > end:
                    in_range = False
                if in_range:
                    total_revenue += e['total']
                    total_cogs += take(e['qty'])
                else:
                    # consume layers for before-period sales without counting
                    take(e['qty'])
    gross = total_revenue - total_cogs
    return {'start': start, 'end': end, 'sales': int(total_revenue), 'cogs': int(total_cogs), 'gross_profit': int(gross), 'method': method}


def product_ledger(session: Session, product_id: str, start: Optional[datetime] = None, end: Optional[datetime] = None):
    """Return chronological movement for a product within [start,end]: purchase/sale lines with running quantity."""
    try:
        inv_q = session.query(models.Invoice).filter(models.Invoice.status == 'final')
        if start:
            inv_q = inv_q.filter(models.Invoice.server_time >= start)
        if end:
            inv_q = inv_q.filter(models.Invoice.server_time <= end)
        invs = inv_q.all()
        if not invs:
            return []
        inv_ids = [i.id for i in invs]
        items = session.query(models.InvoiceItem).filter(
            models.InvoiceItem.invoice_id.in_(inv_ids),
            models.InvoiceItem.product_id == product_id
        ).all()
    except Exception:
        return []
    evs = []
    for it in items:
        inv = next((x for x in invs if x.id == it.invoice_id), None)
        if not inv:
            continue
        t = inv.server_time or inv.client_time
        if not t:
            continue
        evs.append({'date': t, 'type': inv.invoice_type, 'qty': int(it.quantity or 0), 'unit': int(it.unit_price or 0), 'total': int(it.total or 0)})
    evs.sort(key=lambda x: x['date'])
    running = 0
    rows = []
    for e in evs:
        if e['type'] == 'purchase':
            running += e['qty']
        elif e['type'] == 'sale':
            running -= e['qty']
        rows.append({
            'date': e['date'],
            'type': e['type'],
            'qty': e['qty'],
            'unit': e['unit'],
            'total': e['total'],
            'running': running,
        })
    return rows


def report_person_turnover(session: Session, party_id: Optional[str] = None, party_name: Optional[str] = None, start: Optional[datetime] = None, end: Optional[datetime] = None):
    """Compute per-person turnover based on finalized invoices.

    Returns keys expected by UI:
    - total_sale: sum of sale invoices
    - total_purchase: sum of purchase invoices
    - net: sale - purchase
    """
    inv_q = session.query(models.Invoice).filter(models.Invoice.status == 'final')
    if start:
        inv_q = inv_q.filter(models.Invoice.server_time >= start)
    if end:
        inv_q = inv_q.filter(models.Invoice.server_time <= end)
    if party_id:
        inv_q = inv_q.filter(models.Invoice.party_id == party_id)
    if party_name:
        inv_q = inv_q.filter(models.Invoice.party_name.ilike(f"%{party_name}%"))

    sales_total = sum(i.total or 0 for i in inv_q.filter(models.Invoice.invoice_type == 'sale').all())
    purchases_total = sum(i.total or 0 for i in inv_q.filter(models.Invoice.invoice_type == 'purchase').all())
    net = int(sales_total) - int(purchases_total)
    return {
        'party_id': party_id,
        'party_name': party_name,
        'total_sale': int(sales_total),
        'total_purchase': int(purchases_total),
        'net': int(net),
    }


def report_stock_valuation(session: Session, as_of: Optional[datetime] = None):
    """Compute stock valuation.
    - If as_of is None: approximate using current product.inventory and latest price history.
    - If as_of is provided: compute quantity up to as_of via product ledger and use last price effective at or before as_of.
    """
    out = []
    try:
        prods = session.query(models.Product).all()
    except Exception:
        return out
    if not as_of:
        for p in prods:
            last_price = None
            ph = None
            try:
                ph = (
                    session.query(models.PriceHistory)
                    .filter(models.PriceHistory.product_id == p.id)
                    .order_by(models.PriceHistory.effective_at.desc())
                    .first()
                )
            except Exception:
                ph = None
            if ph:
                last_price = ph.price
            total = (p.inventory or 0) * (last_price or 0)
            out.append({
                'product_id': p.id,
                'name': p.name,
                'inventory': int(p.inventory or 0),
                'unit_price': int(last_price) if last_price else None,
                'total_value': int(total),
            })
        return out

    # Date-bounded valuation
    for p in prods:
        rows = product_ledger(session, product_id=p.id, start=None, end=as_of)
        qty = 0
        if rows:
            # product_ledger returns rows sorted by date with 'running' field
            last = rows[-1]
            qty = int(last.get('running') or last.get('running_qty') or 0)
        try:
            ph = (
                session.query(models.PriceHistory)
                .filter(models.PriceHistory.product_id == p.id)
                .filter(models.PriceHistory.effective_at <= as_of)
                .order_by(models.PriceHistory.effective_at.desc())
                .first()
            )
        except Exception:
            ph = None
        last_price = int(ph.price) if ph and ph.price is not None else None
        total = (qty or 0) * (last_price or 0)
        out.append({
            'product_id': p.id,
            'name': p.name,
            'inventory': int(qty or 0),
            'unit_price': last_price,
            'total_value': int(total),
            'as_of': as_of,
        })
    return out


def report_cash_balance(session: Session, method: Optional[str] = None, start: Optional[datetime] = None, end: Optional[datetime] = None):
    try:
        q = session.query(models.Payment).filter(models.Payment.status == 'posted')
        if start:
            q = q.filter(models.Payment.server_time >= start)
        if end:
            q = q.filter(models.Payment.server_time <= end)
        if method:
            q = q.filter(models.Payment.method.ilike(f"%{method}%"))
        # balance = sum(in receipts) - sum(out payments)
        receipts = sum(p.amount or 0 for p in q.filter(models.Payment.direction == 'in').all())
        outs = sum(p.amount or 0 for p in q.filter(models.Payment.direction == 'out').all())
        return {'method': method or 'all', 'balance': int(receipts - outs), 'start': start, 'end': end}
    except Exception:
        return {'method': method or 'all', 'balance': 0, 'start': start, 'end': end}


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


# ==================== Customer Groups CRUD ====================

def create_customer_group(
    session: Session,
    user_id: int,
    payload: schemas.CustomerGroupCreate
) -> models.CustomerGroup:
    """ایجاد گروه مشتری جدید"""
    group = models.CustomerGroup(
        name=payload.name,
        description=payload.description,
        created_by_user_id=user_id,
        is_shared=payload.is_shared
    )
    session.add(group)
    session.commit()
    session.refresh(group)
    return group


def get_customer_group(session: Session, group_id: int) -> Optional[models.CustomerGroup]:
    """دریافت گروه مشتری"""
    return session.query(models.CustomerGroup).filter(models.CustomerGroup.id == group_id).first()


def get_user_customer_groups(
    session: Session,
    user_id: int,
    include_shared: bool = True
) -> List[models.CustomerGroup]:
    """دریافت گروه‌های مشتری کاربر"""
    query = session.query(models.CustomerGroup).filter(
        models.CustomerGroup.created_by_user_id == user_id
    )
    
    if include_shared:
        # می‌توان گروه‌های اشتراکی را هم دریافت کرد
        query = query.filter(
            (models.CustomerGroup.created_by_user_id == user_id) |
            (models.CustomerGroup.is_shared == True)
        )
    
    return query.order_by(models.CustomerGroup.created_at.desc()).all()


def update_customer_group(
    session: Session,
    group_id: int,
    payload: schemas.CustomerGroupUpdate
) -> Optional[models.CustomerGroup]:
    """به‌روزرسانی گروه مشتری"""
    group = get_customer_group(session, group_id)
    if not group:
        return None
    
    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description
    if payload.is_shared is not None:
        group.is_shared = payload.is_shared
    
    group.updated_at = func.now()
    session.commit()
    session.refresh(group)
    return group


def delete_customer_group(session: Session, group_id: int) -> bool:
    """حذف گروه مشتری"""
    group = get_customer_group(session, group_id)
    if not group:
        return False
    
    session.delete(group)
    session.commit()
    return True


def add_customer_to_group(
    session: Session,
    group_id: int,
    person_id: str
) -> Optional[models.CustomerGroupMember]:
    """افزودن مشتری به گروه"""
    # بررسی وجود دوباره
    existing = session.query(models.CustomerGroupMember).filter(
        (models.CustomerGroupMember.group_id == group_id) &
        (models.CustomerGroupMember.person_id == person_id)
    ).first()
    
    if existing:
        return existing
    
    member = models.CustomerGroupMember(
        group_id=group_id,
        person_id=person_id
    )
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


def remove_customer_from_group(
    session: Session,
    group_id: int,
    person_id: str
) -> bool:
    """حذف مشتری از گروه"""
    member = session.query(models.CustomerGroupMember).filter(
        (models.CustomerGroupMember.group_id == group_id) &
        (models.CustomerGroupMember.person_id == person_id)
    ).first()
    
    if not member:
        return False
    
    session.delete(member)
    session.commit()
    return True


def get_group_members(session: Session, group_id: int) -> List[models.CustomerGroupMember]:
    """دریافت اعضای گروه"""
    return session.query(models.CustomerGroupMember).filter(
        models.CustomerGroupMember.group_id == group_id
    ).all()


def get_person_groups(session: Session, person_id: str) -> List[models.CustomerGroup]:
    """دریافت گروه‌هایی که یک مشتری عضو آن است"""
    return session.query(models.CustomerGroup).join(
        models.CustomerGroupMember
    ).filter(
        models.CustomerGroupMember.person_id == person_id
    ).all()


# ==================== ICC Shop CRUD ====================

def create_icc_category(session: Session, payload: schemas.IccCategoryCreate) -> models.IccCategory:
    """ایجاد دسته‌بندی ICC"""
    category = models.IccCategory(
        external_id=payload.external_id,
        name=payload.name,
        description=payload.description,
        parent_external_id=payload.parent_external_id,
        sync_url=payload.sync_url
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def get_icc_category(session: Session, category_id: int) -> Optional[models.IccCategory]:
    """دریافت دسته‌بندی ICC"""
    return session.query(models.IccCategory).filter(models.IccCategory.id == category_id).first()


def get_icc_category_by_external_id(session: Session, external_id: str) -> Optional[models.IccCategory]:
    """دریافت دسته‌بندی بر اساس external_id"""
    return session.query(models.IccCategory).filter(models.IccCategory.external_id == external_id).first()


def get_all_icc_categories(session: Session) -> List[models.IccCategory]:
    """دریافت تمام دسته‌بندی‌های ICC"""
    return session.query(models.IccCategory).order_by(models.IccCategory.name).all()


def update_icc_category(session: Session, category_id: int, payload: schemas.IccCategoryUpdate) -> Optional[models.IccCategory]:
    """به‌روزرسانی دسته‌بندی ICC"""
    category = get_icc_category(session, category_id)
    if not category:
        return None
    
    if payload.name is not None:
        category.name = payload.name
    if payload.description is not None:
        category.description = payload.description
    if payload.parent_external_id is not None:
        category.parent_external_id = payload.parent_external_id
    
    category.updated_at = func.now()
    session.commit()
    session.refresh(category)
    return category


def delete_icc_category(session: Session, category_id: int) -> bool:
    """حذف دسته‌بندی ICC"""
    category = get_icc_category(session, category_id)
    if not category:
        return False
    session.delete(category)
    session.commit()
    return True


def create_icc_center(session: Session, payload: schemas.IccCenterCreate) -> models.IccCenter:
    """ایجاد مرکز ICC"""
    center = models.IccCenter(
        external_id=payload.external_id,
        category_id=payload.category_id,
        name=payload.name,
        address=payload.address,
        phone=payload.phone,
        manager_name=payload.manager_name,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        sync_url=payload.sync_url
    )
    session.add(center)
    session.commit()
    session.refresh(center)
    return center


def get_icc_center(session: Session, center_id: int) -> Optional[models.IccCenter]:
    """دریافت مرکز ICC"""
    return session.query(models.IccCenter).filter(models.IccCenter.id == center_id).first()


def get_icc_centers_by_category(session: Session, category_id: int) -> List[models.IccCenter]:
    """دریافت مراکز یک دسته‌بندی"""
    return session.query(models.IccCenter).filter(models.IccCenter.category_id == category_id).order_by(models.IccCenter.name).all()


def update_icc_center(session: Session, center_id: int, payload: schemas.IccCenterUpdate) -> Optional[models.IccCenter]:
    """به‌روزرسانی مرکز ICC"""
    center = get_icc_center(session, center_id)
    if not center:
        return None
    
    if payload.name is not None:
        center.name = payload.name
    if payload.address is not None:
        center.address = payload.address
    if payload.phone is not None:
        center.phone = payload.phone
    if payload.manager_name is not None:
        center.manager_name = payload.manager_name
    if payload.location_lat is not None:
        center.location_lat = payload.location_lat
    if payload.location_lng is not None:
        center.location_lng = payload.location_lng
    
    center.updated_at = func.now()
    session.commit()
    session.refresh(center)
    return center


def delete_icc_center(session: Session, center_id: int) -> bool:
    """حذف مرکز ICC"""
    center = get_icc_center(session, center_id)
    if not center:
        return False
    session.delete(center)
    session.commit()
    return True


def create_icc_unit(session: Session, payload: schemas.IccUnitCreate) -> models.IccUnit:
    """ایجاد واحد ICC"""
    unit = models.IccUnit(
        external_id=payload.external_id,
        center_id=payload.center_id,
        name=payload.name,
        description=payload.description,
        unit_type=payload.unit_type,
        capacity=payload.capacity,
        sync_url=payload.sync_url
    )
    session.add(unit)
    session.commit()
    session.refresh(unit)
    return unit


def get_icc_unit(session: Session, unit_id: int) -> Optional[models.IccUnit]:
    """دریافت واحد ICC"""
    return session.query(models.IccUnit).filter(models.IccUnit.id == unit_id).first()


def get_icc_units_by_center(session: Session, center_id: int) -> List[models.IccUnit]:
    """دریافت واحدهای یک مرکز"""
    return session.query(models.IccUnit).filter(models.IccUnit.center_id == center_id).order_by(models.IccUnit.name).all()


def update_icc_unit(session: Session, unit_id: int, payload: schemas.IccUnitUpdate) -> Optional[models.IccUnit]:
    """به‌روزرسانی واحد ICC"""
    unit = get_icc_unit(session, unit_id)
    if not unit:
        return None
    
    if payload.name is not None:
        unit.name = payload.name
    if payload.description is not None:
        unit.description = payload.description
    if payload.unit_type is not None:
        unit.unit_type = payload.unit_type
    if payload.capacity is not None:
        unit.capacity = payload.capacity
    
    unit.updated_at = func.now()
    session.commit()
    session.refresh(unit)
    return unit


def delete_icc_unit(session: Session, unit_id: int) -> bool:
    """حذف واحد ICC"""
    unit = get_icc_unit(session, unit_id)
    if not unit:
        return False
    session.delete(unit)
    session.commit()
    return True


def create_icc_extension(session: Session, payload: schemas.IccExtensionCreate) -> models.IccExtension:
    """ایجاد شاخه ICC"""
    extension = models.IccExtension(
        external_id=payload.external_id,
        unit_id=payload.unit_id,
        name=payload.name,
        responsible_name=payload.responsible_name,
        responsible_mobile=payload.responsible_mobile,
        status=payload.status,
        sync_url=payload.sync_url
    )
    session.add(extension)
    session.commit()
    session.refresh(extension)
    return extension


def get_icc_extension(session: Session, extension_id: int) -> Optional[models.IccExtension]:
    """دریافت شاخه ICC"""
    return session.query(models.IccExtension).filter(models.IccExtension.id == extension_id).first()


def get_icc_extensions_by_unit(session: Session, unit_id: int) -> List[models.IccExtension]:
    """دریافت شاخه‌های یک واحد"""
    return session.query(models.IccExtension).filter(models.IccExtension.unit_id == unit_id).order_by(models.IccExtension.name).all()


def update_icc_extension(session: Session, extension_id: int, payload: schemas.IccExtensionUpdate) -> Optional[models.IccExtension]:
    """به‌روزرسانی شاخه ICC"""
    extension = get_icc_extension(session, extension_id)
    if not extension:
        return None
    
    if payload.name is not None:
        extension.name = payload.name
    if payload.responsible_name is not None:
        extension.responsible_name = payload.responsible_name
    if payload.responsible_mobile is not None:
        extension.responsible_mobile = payload.responsible_mobile
    if payload.status is not None:
        extension.status = payload.status
    
    extension.updated_at = func.now()
    session.commit()
    session.refresh(extension)
    return extension


def delete_icc_extension(session: Session, extension_id: int) -> bool:
    """حذف شاخه ICC"""
    extension = get_icc_extension(session, extension_id)
    if not extension:
        return False
    session.delete(extension)
    session.commit()
    return True


# ==================== System Settings CRUD ====================

def get_system_setting(session: Session, key: str) -> Optional[models.SystemSettings]:
    """دریافت تنظیم سیستم بر اساس کلید"""
    return session.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()


def get_system_settings_by_category(session: Session, category: str) -> List[models.SystemSettings]:
    """دریافت تنظیمات بر اساس دسته"""
    return session.query(models.SystemSettings).filter(models.SystemSettings.category == category).all()


def get_all_system_settings(session: Session) -> List[models.SystemSettings]:
    """دریافت تمام تنظیمات سیستم"""
    return session.query(models.SystemSettings).all()


def create_system_setting(session: Session, setting: schemas.SystemSettingCreate, updated_by: int = None) -> models.SystemSettings:
    """ایجاد تنظیم سیستم جدید"""
    db_setting = models.SystemSettings(
        key=setting.key,
        value=setting.value,
        setting_type=setting.setting_type,
        display_name=setting.display_name,
        description=setting.description,
        category=setting.category,
        is_secret=setting.is_secret,
        updated_by=updated_by
    )
    session.add(db_setting)
    session.commit()
    session.refresh(db_setting)
    return db_setting


def update_system_setting(session: Session, key: str, setting: schemas.SystemSettingUpdate, updated_by: int = None) -> Optional[models.SystemSettings]:
    """به‌روزرسانی تنظیم سیستم"""
    db_setting = get_system_setting(session, key)
    if not db_setting:
        return None
    
    update_data = setting.dict(exclude_unset=True)
    update_data['updated_by'] = updated_by
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    for field, value in update_data.items():
        setattr(db_setting, field, value)
    
    session.commit()
    session.refresh(db_setting)
    return db_setting


def delete_system_setting(session: Session, key: str) -> bool:
    """حذف تنظیم سیستم"""
    db_setting = get_system_setting(session, key)
    if not db_setting:
        return False
    session.delete(db_setting)
    session.commit()
    return True


def get_setting_value(session: Session, key: str, default=None):
    """دریافت مقدار تنظیم (بدون جزئیات)"""
    setting = get_system_setting(session, key)
    if not setting:
        return default
    
    # اگر نوع json است، parse کن
    if setting.setting_type == 'json':
        try:
            return json.loads(setting.value) if setting.value else default
        except:
            return default
    elif setting.setting_type == 'int':
        try:
            return int(setting.value) if setting.value else default
        except:
            return default
    elif setting.setting_type == 'bool':
        return setting.value in ['true', 'True', '1', True]
    else:
        return setting.value or default


# ==================== Person Activities CRUD ====================

def list_person_activities(session: Session, person_id: str, limit: int = 100) -> List[models.PersonActivity]:
    return session.query(models.PersonActivity).filter(
        models.PersonActivity.person_id == person_id
    ).order_by(models.PersonActivity.id.desc()).limit(int(limit or 100)).all()


def create_person_activity(session: Session, person_id: str, payload: schemas.PersonActivityCreate, created_by_user_id: Optional[int]) -> models.PersonActivity:
    # Ensure person exists (best-effort)
    p = session.query(models.Person).filter(models.Person.id == person_id).first()
    if not p:
        raise ValueError('Person not found')
    act = models.PersonActivity(
        person_id=person_id,
        kind=(payload.kind or 'note'),
        content=payload.content,
        next_action_at=payload.next_action_at,
        created_by=created_by_user_id,
    )
    session.add(act)
    session.commit()
    session.refresh(act)
    try:
        from .activity_logger import log_activity
        log_activity(session, p.name or None, f"ثبت یادداشت برای شخص {p.name}", path=f"/api/persons/{person_id}/activities", method='POST', status_code=201, detail={'person_id': person_id, 'activity_id': act.id})
    except Exception:
        pass
    return act


def delete_person_activity(session: Session, person_id: str, activity_id: int) -> bool:
    act = session.query(models.PersonActivity).filter(
        models.PersonActivity.id == activity_id,
        models.PersonActivity.person_id == person_id
    ).first()
    if not act:
        return False
    session.delete(act)
    session.commit()
    return True


# ==================== Dashboard Widgets CRUD ====================

def get_user_dashboard_widgets(session: Session, user_id: int) -> List[models.DashboardWidget]:
    """دریافت تمام widgets کاربر"""
    return session.query(models.DashboardWidget).filter(models.DashboardWidget.user_id == user_id).all()


def get_dashboard_widget(session: Session, widget_id: int) -> Optional[models.DashboardWidget]:
    """دریافت widget خاص"""
    return session.query(models.DashboardWidget).filter(models.DashboardWidget.id == widget_id).first()


def create_dashboard_widget(session: Session, user_id: int, widget: schemas.DashboardWidgetCreate) -> models.DashboardWidget:
    """ایجاد widget جدید"""
    db_widget = models.DashboardWidget(
        user_id=user_id,
        widget_type=widget.widget_type,
        title=widget.title,
        position_x=widget.position_x,
        position_y=widget.position_y,
        width=widget.width,
        height=widget.height,
        config=widget.config,
        enabled=widget.enabled,
        order=widget.order
    )
    session.add(db_widget)
    session.commit()
    session.refresh(db_widget)
    return db_widget


def update_dashboard_widget(session: Session, widget_id: int, widget: schemas.DashboardWidgetUpdate) -> Optional[models.DashboardWidget]:
    """به‌روزرسانی widget"""
    db_widget = get_dashboard_widget(session, widget_id)
    if not db_widget:
        return None
    
    update_data = widget.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_widget, field, value)
    
    session.commit()
    session.refresh(db_widget)
    return db_widget


def delete_dashboard_widget(session: Session, widget_id: int) -> bool:
    """حذف widget"""
    db_widget = get_dashboard_widget(session, widget_id)
    if not db_widget:
        return False
    session.delete(db_widget)
    session.commit()
    return True


def reorder_dashboard_widgets(session: Session, user_id: int, widget_positions: List[dict]) -> bool:
    """به‌روزرسانی موقعیت و ترتیب widgets
    
    Args:
        widget_positions: List of dicts with widget_id, position_x, position_y, width, height
    """
    try:
        for pos in widget_positions:
            widget = session.query(models.DashboardWidget).filter(
                models.DashboardWidget.id == pos['widget_id'],
                models.DashboardWidget.user_id == user_id
            ).first()
            if widget:
                widget.position_x = pos.get('position_x', widget.position_x)
                widget.position_y = pos.get('position_y', widget.position_y)
                widget.width = pos.get('width', widget.width)
                widget.height = pos.get('height', widget.height)
        session.commit()
        return True
    except Exception:
        session.rollback()
        return False


# ==================== Sales (Sale Orders) CRUD ====================

def _generate_sale_order_number(reference_dt: datetime, so_id: int) -> str:
    # Format: SO-YYYYMMDD-{id:06d}
    if isinstance(reference_dt, datetime):
        if reference_dt.tzinfo is None:
            ref_aware = reference_dt.replace(tzinfo=timezone.utc)
        else:
            ref_aware = reference_dt.astimezone(timezone.utc)
    else:
        ref_aware = datetime.now(timezone.utc)
    date_part = ref_aware.strftime('%Y%m%d')
    return f"SO-{date_part}-{so_id:06d}"


def create_sale_order(session: Session, payload: 'schemas.SaleOrderCreate') -> models.SaleOrder:
    server_time = datetime.now(timezone.utc)
    client_time = payload.client_time or server_time
    tracking_code = f"TRC-{int(server_time.timestamp())}-{secrets.token_hex(3).upper()}"
    so = models.SaleOrder(
        party_id=payload.party_id,
        party_name=payload.party_name,
        client_time=client_time,
        server_time=server_time,
        status='draft',
        currency=payload.currency or 'IRR',
        note=payload.note,
        tracking_code=tracking_code,
    )
    session.add(so)
    session.commit()
    session.refresh(so)

    subtotal = 0
    for it in payload.items:
        qty = int(it.quantity or 0)
        unit_price = int(it.unit_price or 0)
        line_total = qty * unit_price
        soi = models.SaleOrderItem(
            order_id=so.id,
            description=it.description,
            quantity=qty,
            unit=it.unit,
            unit_price=unit_price,
            discount=int(it.discount or 0) if hasattr(it, 'discount') and it.discount is not None else None,
            tax_rate=int(it.tax_rate or 0) if hasattr(it, 'tax_rate') and it.tax_rate is not None else None,
            total=line_total,
            product_id=it.product_id,
        )
        session.add(soi)
        subtotal += line_total
    so.subtotal = subtotal
    so.total = subtotal if so.total is None else so.total
    # assign order number after id known
    so.order_number = _generate_sale_order_number(client_time, so.id)
    session.add(so)
    session.commit()
    session.refresh(so)
    # attach items
    so.items = session.query(models.SaleOrderItem).filter(models.SaleOrderItem.order_id == so.id).all()
    try:
        from .activity_logger import log_activity
        log_activity(session, payload.party_name or None, f"ایجاد سفارش فروش {so.order_number}", path=f"/api/sales/orders", method='POST', status_code=201, detail={'sale_order_id': so.id})
    except Exception:
        pass
    return so


def get_sale_orders(session: Session, q: Optional[str] = None, limit: int = 100) -> List[models.SaleOrder]:
    qs = session.query(models.SaleOrder).order_by(models.SaleOrder.id.desc())
    if q:
        ql = q.lower()
        qs = qs.filter((models.SaleOrder.order_number.ilike(f"%{ql}%")) | (models.SaleOrder.party_name.ilike(f"%{ql}%")))
    out = qs.limit(limit).all()
    for so in out:
        so.items = session.query(models.SaleOrderItem).filter(models.SaleOrderItem.order_id == so.id).all()
    return out

def get_sale_order(session: Session, so_id: int) -> Optional[models.SaleOrder]:
        so = session.query(models.SaleOrder).filter(models.SaleOrder.id == so_id).first()
        if not so:
            return None
        so.items = session.query(models.SaleOrderItem).filter(models.SaleOrderItem.order_id == so.id).all()
        return so

def update_sale_order(session: Session, so_id: int, data: dict) -> Optional[models.SaleOrder]:
        so = session.query(models.SaleOrder).filter(models.SaleOrder.id == so_id).first()
        if not so:
            return None
        for k, v in data.items():
            if hasattr(so, k):
                setattr(so, k, v)
        session.add(so)
        session.commit()
        session.refresh(so)
        so.items = session.query(models.SaleOrderItem).filter(models.SaleOrderItem.order_id == so.id).all()
        return so

def finalize_sale_order(session: Session, so_id: int, client_time: Optional[datetime] = None) -> Optional[models.SaleOrder]:
        so = session.query(models.SaleOrder).filter(models.SaleOrder.id == so_id).first()
        if not so:
            return None
        if so.status == 'final':
            return so
        # create corresponding invoice (sale) then finalize it to reuse inventory/ledger logic
        items = session.query(models.SaleOrderItem).filter(models.SaleOrderItem.order_id == so.id).all()
        inv_items = [
            schemas.InvoiceItemCreate(
                description=i.description,
                quantity=int(i.quantity or 0),
                unit=i.unit,
                unit_price=int(i.unit_price or 0),
                product_id=i.product_id,
            ) for i in items
        ]
        # Convert datetime to ISO string for InvoiceCreate
        ct = client_time or so.client_time
        client_time_str = ct.isoformat() if ct and hasattr(ct, 'isoformat') else ct
        inv_payload = schemas.InvoiceCreate(
            invoice_type='sale',
            mode='manual',
            party_id=so.party_id,
            party_name=so.party_name,
            client_time=client_time_str,
            items=inv_items,
            note=so.note,
        )
        invoice = create_invoice_manual(session, inv_payload)
        try:
            finalize_invoice(session, invoice.id, client_time=client_time)
        except ValueError as e:
            # roll back invoice if inventory insufficient
            try:
                session.delete(invoice)
                session.commit()
            except Exception:
                session.rollback()
            raise e
        # link invoice to sale order and mark final
        so.invoice_id = invoice.id
        so.status = 'final'
        if client_time:
            so.client_time = client_time
        so.server_time = datetime.now(timezone.utc)
        session.add(so)
        session.commit()
        session.refresh(so)
        so.items = items
        try:
            from .activity_logger import log_activity
            log_activity(session, so.party_name or None, f"تأیید سفارش فروش {so.order_number}", path=f"/api/sales/orders/{so.id}/finalize", method='POST', status_code=200, detail={'sale_order_id': so.id, 'invoice_id': so.invoice_id})
        except Exception:
            pass
        return so
