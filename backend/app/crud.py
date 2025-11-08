from . import models, schemas
from sqlalchemy.orm import Session
from typing import Optional, List
from sqlalchemy.sql import func
from datetime import datetime, timezone
from datetime import timedelta
import requests
import math
from .schemas import ProductCreate, ProductOut, PersonCreate
from .normalizer import normalize_for_search
import hashlib
import json
from . import search as search_client


def create_user(db: Session, user: schemas.UserCreate):
    from .security import get_password_hash
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        role=user.role or 'Viewer',
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def make_hash_id(obj: dict) -> str:
    # canonical JSON over selected attributes + timestamp
    payload = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    h = hashlib.sha256()
    h.update(payload.encode('utf-8'))
    return h.hexdigest()


def create_product(db: Session, p: ProductCreate) -> models.Product:
    norm = normalize_for_search(p.name)
    raw = {"name": p.name, "unit": p.unit or '', "group": p.group or '', "created_at": str(func.now())}
    pid = make_hash_id(raw)
    product = models.Product(id=pid, name=p.name, name_norm=norm, unit=p.unit, group=p.group, description=p.description)
    db.add(product)
    db.commit()
    db.refresh(product)
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
        log_activity(db, uname, f"ایجاد کالا: {product.name} (id={product.id})", path=f"/api/products", method='POST', status_code=201, detail={'product_id': product.id})
    except Exception:
        pass
    return product


def create_product_from_external(db: Session, external: dict, unit: Optional[str] = None, group: Optional[str] = None, create_price_history: bool = True) -> models.Product:
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
    prod = create_product(db, p)
    # optional price history
    try:
        price = external.get('price')
        if create_price_history and price:
            ph = models.PriceHistory(product_id=prod.id, price=int(price), type='sell', effective_at=datetime.utcnow())
            db.add(ph)
            db.commit()
    except Exception:
        pass
    return prod


def get_products(db: Session, q: Optional[str] = None, limit: int = 50):
    qs = db.query(models.Product)
    if q:
        qn = normalize_for_search(q)
        qs = qs.filter(models.Product.name_norm.contains(qn))
    return qs.limit(limit).all()


def create_person(db: Session, p: PersonCreate) -> models.Person:
    norm = normalize_for_search(p.name)
    raw = {"name": p.name, "kind": p.kind or '', "mobile": p.mobile or '', "created_at": str(func.now())}
    pid = make_hash_id(raw)
    person = models.Person(id=pid, name=p.name, name_norm=norm, kind=p.kind, mobile=p.mobile, description=p.description)
    db.add(person)
    db.commit()
    db.refresh(person)
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
        log_activity(db, None, f"ایجاد شخص: {person.name} (id={person.id})", path=f"/api/persons", method='POST', status_code=201, detail={'person_id': person.id})
    except Exception:
        pass
    return person


def get_persons(db: Session, q: Optional[str] = None, limit: int = 50):
    qs = db.query(models.Person)
    if q:
        qn = normalize_for_search(q)
        qs = qs.filter(models.Person.name_norm.contains(qn))
    return qs.limit(limit).all()


def get_users(db: Session):
    return db.query(models.User).all()


def create_time_sync(db: Session, time_in: schemas.TimeSyncCreate):
    # server_time should be set by server side to ensure canonical server timestamp
    from datetime import datetime, timezone
    server_time = datetime.now(timezone.utc)
    db_obj = models.TimeSync(client_time=time_in.client_time, server_time=server_time)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_time_syncs(db: Session, limit: int = 100):
    return db.query(models.TimeSync).order_by(models.TimeSync.id.desc()).limit(limit).all()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def set_assistant_enabled(db: Session, user_id: int, enabled: bool):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        return None
    u.assistant_enabled = bool(enabled)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def authenticate_user(db: Session, username: str, password: str):
    from .security import verify_password
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def set_refresh_token(db: Session, user: models.User, refresh_token: str):
    from .security import get_password_hash
    user.refresh_token_hash = get_password_hash(refresh_token)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def verify_refresh_token(db: Session, user: models.User, refresh_token: str) -> bool:
    from .security import verify_password
    if not user.refresh_token_hash:
        return False
    return verify_password(refresh_token, user.refresh_token_hash)


def revoke_refresh_token(db: Session, user: models.User):
    user.refresh_token_hash = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _generate_invoice_number(db: Session, invoice_type: str) -> str:
    # Format: {TYPELETTER}{YYYY}{MM}{DD}-{id:06d}
    # We will create invoice first to get id; helper for after-commit numbering.
    now = datetime.utcnow()
    prefix = invoice_type[:1].upper() if invoice_type else 'I'
    return f"{prefix}{now.year:04d}{now.month:02d}{now.day:02d}"


def create_invoice_manual(db: Session, inv: schemas.InvoiceCreate) -> models.Invoice:
    # create invoice record without invoice_number, then set number using id
    server_time = datetime.now(timezone.utc)
    invoice = models.Invoice(
        invoice_type=inv.invoice_type,
        mode=inv.mode or 'manual',
        party_id=inv.party_id,
        party_name=inv.party_name,
        client_time=inv.client_time,
        server_time=server_time,
        status='draft',
        note=inv.note,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    # set invoice_number based on date + id
    date_part = server_time.strftime('%Y%m%d')
    invoice.invoice_number = f"{inv.invoice_type[:1].upper() if inv.invoice_type else 'I'}-{date_part}-{invoice.id:06d}"
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
        )
        db.add(ii)
        subtotal += total
    invoice.subtotal = subtotal
    invoice.total = subtotal  # simple: no tax calc by default
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    # attach items for convenience
    items = db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).all()
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
        log_activity(db, who, f"صدور فاکتور {invoice.invoice_number}", path=f"/api/invoices/manual", method='POST', status_code=201, detail={'invoice_id': invoice.id})
    except Exception:
        pass
    return invoice


def get_invoices(db: Session, q: Optional[str] = None, limit: int = 100) -> List[models.Invoice]:
    qs = db.query(models.Invoice).order_by(models.Invoice.id.desc())
    if q:
        # search by invoice_number or party_name
        qn = q.lower()
        qs = qs.filter((models.Invoice.invoice_number.ilike(f"%{qn}%")) | (models.Invoice.party_name.ilike(f"%{qn}%")))
    return qs.limit(limit).all()


def get_invoice(db: Session, invoice_id: int):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    # attach items
    items = db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    # simple attach for convenience
    inv._items = items
    return inv


def update_invoice(db: Session, invoice_id: int, data: dict):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    for k, v in data.items():
        if hasattr(inv, k):
            setattr(inv, k, v)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


def finalize_invoice(db: Session, invoice_id: int, client_time: Optional[datetime] = None):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        return None
    inv.status = 'final'
    if client_time:
        inv.client_time = client_time
    inv.server_time = datetime.now(timezone.utc)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    # Create basic ledger entry: debit AR, credit Sales
    try:
        create_ledger_entry(db,
                            ref_type='invoice',
                            ref_id=str(inv.id),
                            debit_account='AccountsReceivable',
                            credit_account='Sales',
                            amount=int(inv.total or 0),
                            party_id=inv.party_id,
                            party_name=inv.party_name,
                            description=f'Invoice {inv.invoice_number}')
    except Exception:
        pass
    try:
        from .activity_logger import log_activity
        log_activity(db, inv.party_name or None, f"تأیید/پایان فاکتور {inv.invoice_number}", path=f"/api/invoices/{inv.id}/finalize", method='POST', status_code=200, detail={'invoice_id': inv.id})
    except Exception:
        pass
    return inv


def _generate_payment_number(db: Session, direction: str) -> str:
    now = datetime.utcnow()
    prefix = 'R' if direction == 'in' else 'P'
    return f"{prefix}{now.year:04d}{now.month:02d}{now.day:02d}"


def create_payment_manual(db: Session, p: schemas.PaymentCreate) -> models.Payment:
    server_time = datetime.now(timezone.utc)
    pay = models.Payment(
        direction=p.direction,
        mode=p.mode or 'manual',
        party_id=p.party_id,
        party_name=p.party_name,
        method=p.method,
        amount=int(p.amount),
        reference=p.reference,
        client_time=p.client_time,
        server_time=server_time,
        status='draft',
        note=p.note,
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    date_part = server_time.strftime('%Y%m%d')
    pay.payment_number = f"{pay.direction[:1].upper()}-{date_part}-{pay.id:06d}"
    db.add(pay)
    db.commit()
    db.refresh(pay)
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
        log_activity(db, pay.party_name or None, f"صدور رسید/سند پرداخت {pay.payment_number}", path=f"/api/payments/manual", method='POST', status_code=201, detail={'payment_id': pay.id})
    except Exception:
        pass
    return pay


def get_payments(db: Session, q: Optional[str] = None, limit: int = 100):
    qs = db.query(models.Payment).order_by(models.Payment.id.desc())
    if q:
        qn = q.lower()
        qs = qs.filter((models.Payment.payment_number.ilike(f"%{qn}%")) | (models.Payment.party_name.ilike(f"%{qn}%")))
    return qs.limit(limit).all()


def get_payment(db: Session, payment_id: int):
    return db.query(models.Payment).filter(models.Payment.id == payment_id).first()


def finalize_payment(db: Session, payment_id: int, client_time: Optional[datetime] = None):
    pay = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not pay:
        return None
    pay.status = 'posted'
    if client_time:
        pay.client_time = client_time
    pay.server_time = datetime.now(timezone.utc)
    db.add(pay)
    db.commit()
    db.refresh(pay)
    # Create ledger entry depending on direction/method
    try:
        if pay.direction == 'in':
            # receipt: debit Cash/Bank, credit AccountsReceivable (or Sales)
            acct = 'Cash' if (not pay.method or pay.method.lower()=='cash') else ('Bank' if 'bank' in (pay.method or '').lower() else 'POS')
            create_ledger_entry(db, ref_type='payment', ref_id=str(pay.id), debit_account=acct, credit_account='AccountsReceivable', amount=int(pay.amount or 0), party_id=pay.party_id, party_name=pay.party_name, description=f'Payment {pay.payment_number}')
        else:
            # payment out: debit AccountsPayable/Expense, credit Cash/Bank
            acct = 'Cash' if (not pay.method or pay.method.lower()=='cash') else ('Bank' if 'bank' in (pay.method or '').lower() else 'POS')
            create_ledger_entry(db, ref_type='payment', ref_id=str(pay.id), debit_account='Expenses', credit_account=acct, amount=int(pay.amount or 0), party_id=pay.party_id, party_name=pay.party_name, description=f'Payment {pay.payment_number}')
    except Exception:
        pass
        try:
            from .activity_logger import log_activity
            log_activity(db, pay.party_name or None, f"تأیید/پست پرداخت {pay.payment_number}", path=f"/api/payments/{pay.id}/finalize", method='POST', status_code=200, detail={'payment_id': pay.id})
        except Exception:
            pass
    return pay


def create_ledger_entry(db: Session, ref_type: Optional[str], ref_id: Optional[str], debit_account: str, credit_account: str, amount: int, party_id: Optional[str] = None, party_name: Optional[str] = None, description: Optional[str] = None) -> models.LedgerEntry:
    le = models.LedgerEntry(
        ref_type=ref_type,
        ref_id=ref_id,
        debit_account=debit_account,
        credit_account=credit_account,
        amount=int(amount),
        party_id=party_id,
        party_name=party_name,
        description=description,
    )
    db.add(le)
    db.commit()
    db.refresh(le)
    return le


def create_ai_report(db: Session, summary: str, findings: str) -> models.AIReport:
    rep = models.AIReport(summary=summary, findings=findings)
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep


def get_ai_reports(db: Session, limit: int = 100):
    return db.query(models.AIReport).order_by(models.AIReport.report_date.desc()).limit(limit).all()


def get_ai_report(db: Session, report_id: int):
    return db.query(models.AIReport).filter(models.AIReport.id == report_id).first()


def review_ai_report(db: Session, report_id: int, status: str, reviewer_id: Optional[int] = None):
    rep = db.query(models.AIReport).filter(models.AIReport.id == report_id).first()
    if not rep:
        return None
    rep.status = status
    rep.reviewed_by = reviewer_id
    from datetime import datetime
    rep.reviewed_at = datetime.utcnow()
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep


def get_integrations(db: Session):
    return db.query(models.IntegrationConfig).order_by(models.IntegrationConfig.name.asc()).all()


def get_integration(db: Session, integration_id: int):
    return db.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == integration_id).first()


def upsert_integration(db: Session, payload: schemas.IntegrationConfigIn):
    # find by name
    from .security import encrypt_value
    i = db.query(models.IntegrationConfig).filter(models.IntegrationConfig.name == payload.name).first()
    enc_key = encrypt_value(payload.api_key) if hasattr(payload, 'api_key') else None
    if not i:
        i = models.IntegrationConfig(name=payload.name, provider=payload.provider, enabled=bool(payload.enabled), api_key=enc_key, config=payload.config)
        db.add(i)
    else:
        i.provider = payload.provider
        i.enabled = bool(payload.enabled)
        i.api_key = enc_key
        i.config = payload.config
        db.add(i)
    db.commit()
    db.refresh(i)
    return i


def set_integration_enabled(db: Session, integration_id: int, enabled: bool):
    i = db.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == integration_id).first()
    if not i:
        return None
    i.enabled = bool(enabled)
    db.add(i)
    db.commit()
    db.refresh(i)
    return i


def create_shared_file(db: Session, token: str, file_path: str, filename: str, created_by: Optional[int], expires_at: Optional[str] = None):
    from datetime import datetime
    ex = None
    if expires_at:
        try:
            ex = datetime.fromisoformat(expires_at)
        except Exception:
            ex = None
    sf = models.SharedFile(token=token, file_path=file_path, filename=filename, created_by=created_by, expires_at=ex)
    db.add(sf)
    db.commit()
    db.refresh(sf)
    return sf


def get_shared_file_by_token(db: Session, token: str):
    return db.query(models.SharedFile).filter(models.SharedFile.token == token).first()


def create_backup(db: Session, created_by: Optional[int] = None, kind: str = 'manual', note: Optional[str] = None):
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
        data['products'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in db.query(models.Product).all() ]
        data['persons'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in db.query(models.Person).all() ]
        data['invoices'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in db.query(models.Invoice).all() ]
        data['invoice_items'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in db.query(models.InvoiceItem).all() ]
        data['payments'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in db.query(models.Payment).all() ]
        data['ledger_entries'] = [ {c.name: getattr(r, c.name) for c in r.__table__.columns} for r in db.query(models.LedgerEntry).all() ]
        # metadata counts
        meta = {k: len(v) for k, v in data.items()}
        payload = {'created_at': now.isoformat(), 'meta': meta, 'data': data}
        with open(fpath, 'w', encoding='utf-8') as fh:
            json.dump(payload, fh, ensure_ascii=False, default=str)
        size = os.path.getsize(fpath)
        bk = models.Backup(filename=fname, file_path=fpath, kind=kind, created_by=created_by, size_bytes=size, note=note, metadata=json.dumps(meta, ensure_ascii=False))
        db.add(bk)
        db.commit()
        db.refresh(bk)
        try:
            from .activity_logger import log_activity
            log_activity(db, None, f"ایجاد بکاپ {fname}", path=f"/api/backups/manual", method='POST', status_code=201, detail={'backup_id': bk.id})
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


def list_backups(db: Session, limit: int = 100):
    return db.query(models.Backup).order_by(models.Backup.created_at.desc()).limit(limit).all()


def get_backup(db: Session, backup_id: int):
    return db.query(models.Backup).filter(models.Backup.id == backup_id).first()


def create_financial_year(db: Session, name: str, start_date: str, end_date: Optional[str] = None):
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
    db.add(fy)
    db.commit()
    db.refresh(fy)
    return fy


def get_financial_years(db: Session):
    return db.query(models.FinancialYear).order_by(models.FinancialYear.start_date.desc()).all()


def close_financial_year(db: Session, fy_id: int, create_rollover: bool = True, closed_by: Optional[int] = None):
    """Close the financial year: compute account balances from ledger and create balancing entries moving net to RetainedEarnings.
    This is a simple implementation and should be reviewed for accounting correctness for production use.
    """
    import json
    from datetime import datetime
    fy = db.query(models.FinancialYear).filter(models.FinancialYear.id == fy_id).first()
    if not fy:
        return None
    if fy.is_closed:
        return fy
    # determine period end: use fy.end_date or now
    end = fy.end_date if fy.end_date else datetime.utcnow()
    # compute balances per account: debit - credit
    accounts = {}
    entries = db.query(models.LedgerEntry).filter(models.LedgerEntry.entry_date <= end).all()
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
                create_ledger_entry(db, ref_type='closing', ref_id=str(fy.id), debit_account='RetainedEarnings', credit_account=acct, amount=int(bal), description=f'Closing {acct} for FY {fy.name}')
            else:
                # negative balance (credit), debit the account and credit RetainedEarnings
                create_ledger_entry(db, ref_type='closing', ref_id=str(fy.id), debit_account=acct, credit_account='RetainedEarnings', amount=int(abs(bal)), description=f'Closing {acct} for FY {fy.name}')
            rollover[acct] = int(bal)
        except Exception:
            pass
    # mark closed
    fy.is_closed = True
    fy.closed_at = datetime.utcnow()
    fy.opening_balances = json.dumps(rollover, ensure_ascii=False)
    db.add(fy)
    db.commit()
    db.refresh(fy)
    try:
        from .activity_logger import log_activity
        log_activity(db, None, f"بستن سال مالی {fy.name}", path=f"/api/financial-years/{fy.id}/close", method='POST', status_code=200, detail={'closed_by': closed_by})
    except Exception:
        pass
    return fy


def get_ledger_entries(db: Session, start: Optional[datetime] = None, end: Optional[datetime] = None, party_id: Optional[str] = None, ref_type: Optional[str] = None, limit: int = 200):
    qs = db.query(models.LedgerEntry).order_by(models.LedgerEntry.entry_date.desc())
    if start:
        qs = qs.filter(models.LedgerEntry.entry_date >= start)
    if end:
        qs = qs.filter(models.LedgerEntry.entry_date <= end)
    if party_id:
        qs = qs.filter(models.LedgerEntry.party_id == party_id)
    if ref_type:
        qs = qs.filter(models.LedgerEntry.ref_type == ref_type)
    return qs.limit(limit).all()


def report_pnl(db: Session, start: Optional[datetime] = None, end: Optional[datetime] = None):
    # Simple P&L: sum of finalized sales invoices minus finalized purchase invoices in range
    q = db.query(models.Invoice).filter(models.Invoice.status == 'final')
    if start:
        q = q.filter(models.Invoice.server_time >= start)
    if end:
        q = q.filter(models.Invoice.server_time <= end)
    sales = sum(i.total or 0 for i in q.filter(models.Invoice.invoice_type == 'sale').all())
    purchases = sum(i.total or 0 for i in q.filter(models.Invoice.invoice_type == 'purchase').all())
    gross = sales - purchases
    return {'start': start, 'end': end, 'sales': int(sales), 'purchases': int(purchases), 'gross_profit': int(gross)}


def report_person_turnover(db: Session, party_id: Optional[str] = None, party_name: Optional[str] = None, start: Optional[datetime] = None, end: Optional[datetime] = None):
    # Sum invoices and payments for a person
    inv_q = db.query(models.Invoice).filter(models.Invoice.status == 'final')
    pay_q = db.query(models.Payment).filter(models.Payment.status == 'posted')
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


def report_stock_valuation(db: Session):
    # For each product, compute inventory * last known price (from price history) as approximation
    out = []
    prods = db.query(models.Product).all()
    for p in prods:
        last_price = None
        ph = db.query(models.PriceHistory).filter(models.PriceHistory.product_id == p.id).order_by(models.PriceHistory.effective_at.desc()).first()
        if ph:
            last_price = ph.price
        total = (p.inventory or 0) * (last_price or 0)
        out.append({'product_id': p.id, 'name': p.name, 'inventory': int(p.inventory or 0), 'unit_price': int(last_price) if last_price else None, 'total_value': int(total)})
    return out


def report_cash_balance(db: Session, method: Optional[str] = None):
    q = db.query(models.Payment).filter(models.Payment.status == 'posted')
    if method:
        q = q.filter(models.Payment.method.ilike(f"%{method}%"))
    # balance = sum(in receipts) - sum(out payments)
    receipts = sum(p.amount or 0 for p in q.filter(models.Payment.direction == 'in').all())
    outs = sum(p.amount or 0 for p in q.filter(models.Payment.direction == 'out').all())
    return {'method': method or 'all', 'balance': int(receipts - outs)}


def dashboard_summary(db: Session):
    # counts: invoices today/7days/month
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_7 = now - timedelta(days=7)
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    invoices_today = db.query(models.Invoice).filter(models.Invoice.server_time >= start_today).count()
    invoices_7 = db.query(models.Invoice).filter(models.Invoice.server_time >= start_7).count()
    invoices_month = db.query(models.Invoice).filter(models.Invoice.server_time >= start_month).count()
    receipts_today = db.query(models.Payment).filter(models.Payment.direction == 'in', models.Payment.server_time >= start_today).all()
    payments_today = db.query(models.Payment).filter(models.Payment.direction == 'out', models.Payment.server_time >= start_today).all()
    receipts_total = sum(p.amount or 0 for p in receipts_today)
    payments_total = sum(p.amount or 0 for p in payments_today)
    net_today = receipts_total - payments_total
    # cash balances by method
    cash_balances = {}
    for m in ['cash', 'bank', 'pos']:
        cash_balances[m] = report_cash_balance(db, method=m).get('balance', 0)
    return {
        'invoices': {'today': invoices_today, '7days': invoices_7, 'month': invoices_month},
        'receipts_today': int(receipts_total),
        'payments_today': int(payments_total),
        'net_today': int(net_today),
        'cash_balances': cash_balances,
    }


def dashboard_sales_trends(db: Session, days: int = 30):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    invoices = db.query(models.Invoice).filter(models.Invoice.status == 'final', models.Invoice.server_time >= start).all()
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


def dashboard_old_stock(db: Session, days: int = 90, min_qty: int = 1):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    out = []
    prods = db.query(models.Product).filter(models.Product.inventory >= min_qty).all()
    for p in prods:
        ph = db.query(models.PriceHistory).filter(models.PriceHistory.product_id == p.id).order_by(models.PriceHistory.effective_at.desc()).first()
        last_price_at = ph.effective_at if ph else None
        last_sale_at = None
        # attempt to find last sale date by invoice items linking — invoice items are not linked to product id currently
        # fallback: consider last_price_at
        last_activity = last_price_at
        if not last_activity or last_activity < cutoff:
            out.append({'product_id': p.id, 'name': p.name, 'inventory': int(p.inventory or 0), 'last_price_at': (last_price_at.isoformat() if last_price_at else None)})
    return out


def dashboard_checks_due(db: Session, within_days: int = 14):
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=within_days)
    pays = db.query(models.Payment).filter(models.Payment.due_date != None, models.Payment.due_date >= now, models.Payment.due_date <= end).all()
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
