from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from . import db, crud, schemas, security
from .ocr_parser import parse_invoice_file
from .ocr_parser import parse_payment_file
import tempfile
import shutil
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import jdatetime
from typing import List, Optional
import os

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import OAuth2PasswordBearer
from . import models
from .schemas import InvoiceCreate, InvoiceOut
from .schemas import PaymentCreate, PaymentOut
from .search import search_multi, suggest_live
from .schemas import ProductCreate, ProductOut, PersonCreate, PersonOut
from . import external_search
from .schemas import ExternalSearchRequest, ExternalProduct, SaveExternalProductRequest
from .schemas import AssistantRequest, AssistantResponse, AssistantToggle, OTPVerifyRequest, OTPSetupResponse, OTPDisableRequest
from .exports import export_invoice_pdf, export_invoice_csv, export_invoice_excel, EXPORT_DIR
from .activity_logger import log_activity
from fastapi.responses import HTMLResponse, FileResponse
from .version import get_version_info

DB = db

app = FastAPI(title="hesabpak Backend")


# Simple audit middleware: logs each request/response to audit_logs table
class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        user_id = None
        auth = request.headers.get('authorization')
        if auth and auth.lower().startswith('bearer '):
            token = auth.split(None, 1)[1]
            try:
                payload = security.decode_token(token)
                sub = payload.get('sub')
                # lookup user id by username
                session = DB.SessionLocal()
                try:
                    user = crud.get_user_by_username(session, sub)
                    if user:
                        user_id = user.id
                finally:
                    session.close()
            except Exception:
                user_id = None
        response = await call_next(request)
        # write audit log (file + DB) using activity_logger
        try:
            from .activity_logger import log_request
            uname = None
            if user_id:
                # try to get username for nicer display
                s = DB.SessionLocal()
                try:
                    u = crud.get_user(s, user_id)
                    if u:
                        uname = u.username
                finally:
                    try:
                        s.close()
                    except Exception:
                        pass
            log_request(request, response, username=uname)
        except Exception:
            pass
        return response


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

app.add_middleware(AuditMiddleware)


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(db.get_db)):
    try:
        payload = security.decode_token(token)
        username = payload.get('sub')
        if username is None:
            raise HTTPException(status_code=401, detail='Invalid authentication')
    except Exception as e:
        raise HTTPException(status_code=401, detail='Invalid token')
    user = crud.get_user_by_username(session, username)
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


@app.get('/api/admin/activity', response_model=list[schemas.ActivityLogOut])
def list_activity(q: Optional[str] = None, user_id: Optional[int] = None, start: Optional[str] = None, end: Optional[str] = None, limit: Optional[int] = 100, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    qs = session.query(models.AuditLog).order_by(models.AuditLog.created_at.desc())
    if q:
        qs = qs.filter(models.AuditLog.detail.ilike(f"%{q}%"))
    if user_id:
        qs = qs.filter(models.AuditLog.user_id == user_id)
    if start:
        try:
            from datetime import datetime
            s = datetime.fromisoformat(start)
            qs = qs.filter(models.AuditLog.created_at >= s)
        except Exception:
            pass
    if end:
        try:
            from datetime import datetime
            e = datetime.fromisoformat(end)
            qs = qs.filter(models.AuditLog.created_at <= e)
        except Exception:
            pass
    return qs.limit(int(limit or 100)).all()


@app.get('/api/admin/activity/{aid}', response_model=schemas.ActivityLogOut)
def get_activity(aid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    a = session.query(models.AuditLog).filter(models.AuditLog.id == aid).first()
    if not a:
        raise HTTPException(status_code=404, detail='Activity not found')
    return a


@app.patch('/api/admin/activity/{aid}', response_model=schemas.ActivityLogOut)
def patch_activity(aid: int, payload: schemas.ActivityLogUpdate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    a = session.query(models.AuditLog).filter(models.AuditLog.id == aid).first()
    if not a:
        raise HTTPException(status_code=404, detail='Activity not found')
    if payload.detail is not None:
        a.detail = payload.detail
    session.add(a)
    session.commit()
    session.refresh(a)
    # also write to file log to reflect edit
    try:
        log_activity(None, current.username if current else None, f"ویرایش لاگ {aid}", path=f"/api/admin/activity/{aid}", method='PATCH', status_code=200, detail={'edited_by': current.username})
    except Exception:
        pass
    return a


def require_roles(role_ids: List[int] = None, role_names: List[str] = None):
    """بررسی دسترسی بر اساس role ID یا نام
    
    استفاده:
    - require_roles(role_ids=[1])  # فقط Admin (ID=1)
    - require_roles(role_names=['Admin'])  # فقط Admin (نام)
    """
    def _dependency(current_user: models.User = Depends(get_current_user)):
        if not current_user.role_id:
            raise HTTPException(status_code=403, detail='کاربر نقشی ندارد')
        
        if role_ids and current_user.role_id not in role_ids:
            raise HTTPException(status_code=403, detail='شما دسترسی ندارید')
        
        if role_names and current_user.role_obj:
            if current_user.role_obj.name not in role_names:
                raise HTTPException(status_code=403, detail='شما دسترسی ندارید')
        
        return current_user
    return _dependency


@app.on_event("startup")
def on_startup():
    # Ensure DB tables exist for simple dev setup. Alembic is primary migration tool.
    db.Base.metadata.create_all(bind=db.engine)


@app.get("/api/hello")
def hello():
    return {"message": "Hello from hesabpak backend (FastAPI)!"}


@app.get("/api/time/now")
def time_now():
    # return server time snapshots with Jalali representation
    local_now = datetime.now().astimezone()
    utc_now = local_now.astimezone(timezone.utc)
    offset_delta = local_now.utcoffset()
    offset_seconds = int(offset_delta.total_seconds()) if offset_delta is not None else 0
    sign = '+' if offset_seconds >= 0 else '-'
    total_minutes = abs(offset_seconds) // 60
    hours, minutes = divmod(total_minutes, 60)
    offset_str = f"{sign}{hours:02d}:{minutes:02d}"
    try:
        jalali_now = jdatetime.datetime.fromgregorian(datetime=local_now.replace(tzinfo=None))
        jalali_str = jalali_now.strftime("%Y/%m/%d %H:%M:%S")
    except Exception:
        jalali_str = None
    return {
        "utc": utc_now.isoformat(),
        "server_local": local_now.isoformat(),
        "server_offset_seconds": offset_seconds,
        "server_offset": offset_str,
        "jalali": jalali_str,
        "epoch_ms": int(utc_now.timestamp() * 1000),
    }


@app.get('/api/version')
def api_version():
    try:
        return get_version_info()
    except Exception:
        return {"version": "unknown"}


@app.post("/api/time/sync", response_model=schemas.TimeSync)
def time_sync(payload: schemas.TimeSyncCreate, session: Session = Depends(db.get_db)):
    # Create a timesync record where server_time is canonical (UTC)
    try:
        record = crud.create_time_sync(session, payload)
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, session: Session = Depends(db.get_db)):
    try:
        return crud.create_user(session, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post('/api/auth/register', response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, session: Session = Depends(db.get_db)):
    try:
        user = crud.create_user(session, user_in)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post('/api/auth/login', response_model=schemas.Token)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(db.get_db)):
    user = crud.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail='Incorrect username or password')
    if not user.is_active:
        raise HTTPException(status_code=403, detail='User disabled')
    form = await request.form()
    otp_code = form.get('otp')
    if user.otp_enabled:
        otp_secret = security.decrypt_value(user.otp_secret) if user.otp_secret else None
        if not otp_code:
            raise HTTPException(status_code=428, detail='OTP required')
        if not otp_secret or not security.verify_otp(otp_secret, otp_code):
            raise HTTPException(status_code=400, detail='Invalid OTP')
    access_token = security.create_access_token(user.username, expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = security.create_refresh_token(user.username)
    crud.set_refresh_token(session, user, refresh_token)
    return schemas.Token(access_token=access_token, refresh_token=refresh_token, otp_required=False)


@app.post('/api/auth/refresh', response_model=schemas.Token)
def refresh_token(payload: dict, session: Session = Depends(db.get_db)):
    refresh = payload.get('refresh_token')
    if not refresh:
        raise HTTPException(status_code=400, detail='refresh_token required')
    try:
        data = security.decode_token(refresh)
        username = data.get('sub')
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    user = crud.get_user_by_username(session, username)
    if not user or not crud.verify_refresh_token(session, user, refresh):
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    # issue new tokens
    access_token = security.create_access_token(user.username)
    new_refresh = security.create_refresh_token(user.username)
    crud.set_refresh_token(session, user, new_refresh)
    return schemas.Token(access_token=access_token, refresh_token=new_refresh, otp_required=False)


@app.post('/api/auth/logout')
def logout(current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    crud.revoke_refresh_token(session, current_user)
    return {'ok': True}


@app.post('/api/auth/otp/setup', response_model=OTPSetupResponse)
def otp_setup(current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    secret = security.generate_otp_secret()
    crud.set_user_otp_secret(session, current_user, secret, enabled=False)
    uri = security.generate_otp_uri(current_user.username, secret)
    return OTPSetupResponse(secret=secret, uri=uri)


@app.post('/api/auth/otp/verify')
def otp_verify(payload: OTPVerifyRequest, current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    otp_secret = security.decrypt_value(current_user.otp_secret) if current_user.otp_secret else None
    if not otp_secret:
        raise HTTPException(status_code=400, detail='OTP secret not generated')
    if not security.verify_otp(otp_secret, payload.code):
        raise HTTPException(status_code=400, detail='Invalid OTP code')
    crud.enable_user_otp(session, current_user)
    return {'otp_enabled': True}


@app.post('/api/auth/otp/disable')
def otp_disable(payload: OTPDisableRequest, current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    if current_user.otp_enabled:
        if payload.code:
            otp_secret = security.decrypt_value(current_user.otp_secret) if current_user.otp_secret else None
            if not otp_secret or not security.verify_otp(otp_secret, payload.code):
                raise HTTPException(status_code=400, detail='Invalid OTP code')
        crud.disable_user_otp(session, current_user)
    return {'otp_enabled': False}


# Example protected route
@app.get('/api/admin-only')
def admin_only(user = Depends(require_roles(role_names=['Admin']))):
    return {'msg': f'Hello {user.username}, you are admin.'}


@app.get('/api/auth/me', response_model=schemas.UserOut)
def me(current_user = Depends(get_current_user)):
    return current_user


@app.post('/api/invoices/manual', response_model=InvoiceOut)
def create_invoice_manual(payload: InvoiceCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # require at least Cashier
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    inv = crud.create_invoice_manual(session, payload)
    return inv


@app.post('/api/invoices/smart')
def parse_invoice_upload(file: UploadFile = File(...), current: models.User = Depends(get_current_user)):
    # accept image or PDF and return parsed draft; user will confirm in client
    try:
        tmp = tempfile.mkdtemp(prefix='ocr-')
        fp = f"{tmp}/{file.filename}"
        with open(fp, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        draft = parse_invoice_file(fp)
        return {'draft': draft}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            file.file.close()
        except Exception:
            pass


@app.post('/api/invoices/from-draft', response_model=InvoiceOut)
def create_invoice_from_draft(payload: InvoiceCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    inv = crud.create_invoice_manual(session, payload)
    return inv


@app.get('/api/invoices', response_model=list[InvoiceOut])
def list_invoices(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    invs = crud.get_invoices(session, q=q)
    # load items for each
    out = []
    for inv in invs:
        # use the current request DB session to load related items
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
        out.append(inv)
    return out


@app.get('/api/invoices/open-for-payment', response_model=list[InvoiceOut])
def list_open_invoices(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    # Return invoices that are not fully paid (draft or final, and either no payments or payments < total)
    invs = session.query(models.Invoice).filter(
        models.Invoice.status.in_(['draft', 'final'])
    ).order_by(models.Invoice.server_time.desc()).limit(100).all()
    out = []
    for inv in invs:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
        out.append(inv)
    return out


@app.get('/api/integrations', response_model=list[schemas.IntegrationConfigOut])
def list_integrations(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    return crud.get_integrations(db)


@app.post('/api/integrations', response_model=schemas.IntegrationConfigOut)
def upsert_integration(payload: schemas.IntegrationConfigIn, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    i = crud.upsert_integration(session, payload)
    return i


@app.patch('/api/integrations/{iid}/toggle', response_model=schemas.IntegrationConfigOut)
def toggle_integration(iid: int, enabled: bool, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    i = crud.set_integration_enabled(session, iid, enabled)
    if not i:
        raise HTTPException(status_code=404, detail='Integration not found')
    return i


@app.post('/api/integrations/{iid}/refresh', response_model=schemas.IntegrationRefreshResult)
def refresh_integration_endpoint(iid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    integ = crud.get_integration(session, iid)
    if not integ:
        raise HTTPException(status_code=404, detail='Integration not found')
    stat = external_search.aggregate_search if integ.provider in ('digikala', 'torob', 'emalls') else None
    # prefer specialized integrations client
    from .integrations import refresh_integration as _refresh
    stat = _refresh(db, iid)
    # map to schema
    return {
        'name': integ.name,
        'provider': integ.provider,
        'enabled': integ.enabled,
        'status': stat.get('status') if isinstance(stat, dict) else str(stat),
        'sample': stat.get('sample') if isinstance(stat, dict) else None,
        'last_updated': integ.last_updated,
    }


@app.get('/api/invoices/{invoice_id}', response_model=InvoiceOut)
def get_invoice(invoice_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    inv = crud.get_invoice(session, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    # ensure items loaded
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    inv.items = items
    return inv


@app.get('/api/invoices/{invoice_id}/payments', response_model=list[PaymentOut])
def get_invoice_payments(invoice_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    inv = crud.get_invoice(session, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    # Find payments where reference matches invoice_number
    payments = session.query(models.Payment).filter(
        models.Payment.reference.ilike(f'%{inv.invoice_number}%')
    ).all()
    return payments

@app.get('/api/trace/{tracking_code}')
def trace_chain(tracking_code: str, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    invoice = session.query(models.Invoice).filter(models.Invoice.tracking_code == tracking_code).first()
    payments = session.query(models.Payment).filter(models.Payment.tracking_code == tracking_code).all()
    ledger = session.query(models.LedgerEntry).filter(models.LedgerEntry.tracking_code == tracking_code).all()
    items = []
    if invoice:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).all()
    return {
        'tracking_code': tracking_code,
        'invoice': invoice,
        'payments': payments,
        'ledger_entries': ledger,
        'items': items,
    }


@app.get('/api/ledger/account-balances')
def account_balances(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Viewer'])(current)
    # Calculate account balances: debit - credit per account
    all_entries = session.query(models.LedgerEntry).all()
    balances = {}
    for entry in all_entries:
        if entry.debit_account not in balances:
            balances[entry.debit_account] = 0
        if entry.credit_account not in balances:
            balances[entry.credit_account] = 0
        balances[entry.debit_account] += entry.amount
        balances[entry.credit_account] -= entry.amount
    return {'balances': balances}


@app.get('/api/persons/balances')
def persons_balances(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Get debit/credit balances for all persons"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Salesman', 'Viewer'])(current)
    
    # Get all persons
    persons = session.query(models.Person).all()
    
    # Calculate balances for each person
    result = []
    for person in persons:
        entries = session.query(models.LedgerEntry).filter(models.LedgerEntry.party_id == str(person.id)).all()
        
        # Calculate debit (receivable - customer owes us)
        debit_total = sum(e.amount for e in entries if e.debit_account == 'AccountsReceivable')
        # Calculate credit (payable - we owe them)
        credit_total = sum(e.amount for e in entries if e.credit_account == 'AccountsReceivable')
        
        # Net balance: positive = they owe us (debtor), negative = we owe them (creditor)
        net_balance = debit_total - credit_total
        
        result.append({
            'person_id': str(person.id),
            'debit': debit_total,
            'credit': credit_total,
            'balance': net_balance
        })
    
    return {'balances': result}


@app.get('/api/ledger/party/{party_id}')
def party_ledger(party_id: str, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Salesman', 'Viewer'])(current)
    
    # Get person details
    person = session.query(models.Person).filter(models.Person.id == party_id).first()
    if not person:
        raise HTTPException(status_code=404, detail='Person not found')
    
    # Get all ledger entries for this party
    ledger_entries = session.query(models.LedgerEntry).filter(
        models.LedgerEntry.party_id == party_id
    ).order_by(models.LedgerEntry.entry_date.desc()).all()
    
    # Enrich entries with related invoice/payment details
    enriched_entries = []
    for entry in ledger_entries:
        entry_data = {
            'id': entry.id,
            'description': entry.description,
            'debit_account': entry.debit_account,
            'credit_account': entry.credit_account,
            'amount': entry.amount,
            'entry_date': entry.entry_date.isoformat() if entry.entry_date else None,
            'ref_type': entry.ref_type,
            'ref_id': entry.ref_id,
            'invoice': None,
            'payment': None,
        }
        
        # Try to find related invoice
        if entry.ref_type == 'invoice' and entry.ref_id:
            try:
                invoice_id = int(entry.ref_id)
                invoice = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
                if invoice:
                    entry_data['invoice'] = {
                        'id': invoice.id,
                        'invoice_number': invoice.invoice_number,
                        'issue_date': (invoice.client_time or invoice.server_time).isoformat() if (invoice.client_time or invoice.server_time) else None,
                        'total_amount': invoice.total or 0,
                        'status': invoice.status,
                    }
            except (ValueError, TypeError):
                pass
        
        # Try to find related payment
        if entry.ref_type == 'payment' and entry.ref_id:
            try:
                payment_id = int(entry.ref_id)
                payment = session.query(models.Payment).filter(models.Payment.id == payment_id).first()
                if payment:
                    entry_data['payment'] = {
                        'id': payment.id,
                        'amount': payment.amount,
                        'payment_date': (payment.client_time or payment.server_time).isoformat() if (payment.client_time or payment.server_time) else None,
                        'method': payment.method,
                        'reference': payment.reference,
                    }
            except (ValueError, TypeError):
                pass
        
        enriched_entries.append(entry_data)
    
    # Calculate running balance
    running_balance = 0
    for entry in reversed(enriched_entries):
        if entry['debit_account'] == 'AccountsReceivable':
            running_balance += entry['amount']
        elif entry['credit_account'] == 'AccountsReceivable':
            running_balance -= entry['amount']
        entry['running_balance'] = running_balance
    
    enriched_entries.reverse()
    
    # Calculate totals
    debit_total = sum(e['amount'] for e in enriched_entries if e['debit_account'] == 'AccountsReceivable')
    credit_total = sum(e['amount'] for e in enriched_entries if e['credit_account'] == 'AccountsReceivable')
    net_balance = debit_total - credit_total
    
    return {
        'party_id': party_id,
        'person': {
            'id': person.id,
            'name': person.name,
            'kind': person.kind,
            'mobile': person.mobile,
            'code': person.code,
        },
        'entries': enriched_entries,
        'debit_total': debit_total,
        'credit_total': credit_total,
        'net_balance': net_balance,
    }


@app.patch('/api/invoices/{invoice_id}', response_model=InvoiceOut)
def patch_invoice(invoice_id: int, payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    inv = crud.update_invoice(session, invoice_id, payload)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    inv.items = items
    return inv


@app.post('/api/invoices/{invoice_id}/finalize', response_model=InvoiceOut)
def finalize_invoice(invoice_id: int, payload: dict = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    client_time = None
    if payload and isinstance(payload, dict):
        ct = payload.get('client_time')
        if ct:
            from datetime import datetime
            try:
                client_time = datetime.fromisoformat(ct)
            except Exception:
                client_time = None
    inv = crud.finalize_invoice(session, invoice_id, client_time=client_time)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    inv.items = items
    return inv


@app.post('/api/payments/manual', response_model=schemas.PaymentOut)
def create_payment_manual(payload: schemas.PaymentCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    pay = crud.create_payment_manual(session, payload)
    return pay


@app.post('/api/payments/smart')
def parse_payment_upload(file: UploadFile = File(...), current: models.User = Depends(get_current_user)):
    try:
        tmp = tempfile.mkdtemp(prefix='ocr-')
        fp = f"{tmp}/{file.filename}"
        with open(fp, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        draft = parse_payment_file(fp)
        return {'draft': draft}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            file.file.close()
        except Exception:
            pass


@app.post('/api/payments/from-draft', response_model=schemas.PaymentOut)
def create_payment_from_draft(payload: schemas.PaymentCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    pay = crud.create_payment_manual(session, payload)
    return pay


@app.get('/api/payments', response_model=list[schemas.PaymentOut])
def list_payments(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    pays = crud.get_payments(session, q=q)
    return pays


@app.get('/api/payments/{payment_id}', response_model=schemas.PaymentOut)
def get_payment(payment_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    p = crud.get_payment(session, payment_id)
    if not p:
        raise HTTPException(status_code=404, detail='Payment not found')
    return p


@app.patch('/api/payments/{payment_id}', response_model=schemas.PaymentOut)
def patch_payment(payment_id: int, payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    p = crud.update_invoice(session, payment_id, payload)  # reuse generic update helper
    if not p:
        raise HTTPException(status_code=404, detail='Payment not found')
    return p


@app.post('/api/payments/{payment_id}/finalize', response_model=schemas.PaymentOut)
def finalize_payment_endpoint(payment_id: int, payload: dict = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    client_time = None
    if payload and isinstance(payload, dict):
        ct = payload.get('client_time')
        if ct:
            from datetime import datetime
            try:
                client_time = datetime.fromisoformat(ct)
            except Exception:
                client_time = None
    p = crud.finalize_payment(session, payment_id, client_time=client_time)
    if not p:
        raise HTTPException(status_code=404, detail='Payment not found')
    return p


def _parse_natural_query(q: str):
    """Very small parser: returns dict with possible filters: start,end,amount_min,party_name,invoice_type"""
    import re
    from datetime import datetime, timedelta
    res = {}
    ql = q or ''
    # amount like '5 میلیون' or '5000000' or '5,000,000'
    m = re.search(r"(\d+[\.,\d]*)\s*(میلیون|هزار|تومان|ریال)?", ql)
    if m:
        num = m.group(1).replace(',', '').replace('.', '')
        unit = m.group(2)
        try:
            val = int(num)
        except Exception:
            try:
                val = int(float(num))
            except Exception:
                val = None
        if unit:
            if 'میلیون' in unit:
                val = int(val * 1_000_000)
            elif 'هزار' in unit:
                val = int(val * 1_000)
        res['amount_min'] = val
    # date keywords
    if 'این هفته' in ql or 'هفته' in ql:
        today = datetime.utcnow()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        res['start'] = start
        res['end'] = end
    if 'ماه' in ql or 'ماه جاری' in ql:
        today = datetime.utcnow()
        start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # naive month end: next month first -1 second
        if today.month == 12:
            nm = today.replace(year=today.year+1, month=1, day=1)
        else:
            nm = today.replace(month=today.month+1, day=1)
        end = nm - timedelta(seconds=1)
        res['start'] = start
        res['end'] = end
    # party name
    m2 = re.search(r'برای\s+([\u0600-\u06FF\w\s]+)', ql)
    if m2:
        res['party_name'] = m2.group(1).strip()
    else:
        m3 = re.search(r'for\s+([\w\s]+)', ql, re.I)
        if m3:
            res['party_name'] = m3.group(1).strip()
    # invoice type
    if 'فروش' in ql or 'sell' in ql.lower():
        res['invoice_type'] = 'sale'
    if 'خرید' in ql or 'purchase' in ql.lower():
        res['invoice_type'] = 'purchase'
    return res


@app.post('/api/reports/query')
def reports_query(payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Accepts {'q': '...'} and returns invoices matching a small set of parsed filters."""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    q = payload.get('q') if isinstance(payload, dict) else None
    if not q:
        raise HTTPException(status_code=400, detail='q required')
    filters = _parse_natural_query(q)
    # fetch invoices in date range
    start = filters.get('start')
    end = filters.get('end')
    invs = crud.get_invoices(session, q=None, limit=500)
    res = []
    for inv in invs:
        ok = True
        if filters.get('invoice_type') and inv.invoice_type != filters.get('invoice_type'):
            ok = False
        if start and inv.server_time and inv.server_time < start:
            ok = False
        if end and inv.server_time and inv.server_time > end:
            ok = False
        if filters.get('party_name') and inv.party_name:
            if filters.get('party_name') not in (inv.party_name or ''):
                ok = False
        amt_min = filters.get('amount_min')
        if amt_min and (inv.total or 0) < amt_min:
            ok = False
        if ok:
            res.append({'id': inv.id, 'invoice_number': inv.invoice_number, 'party_name': inv.party_name, 'total': inv.total, 'server_time': inv.server_time})
    return {'query': q, 'matches': res}


@app.get('/api/reports/pnl')
def reports_pnl(start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    from datetime import datetime
    s = datetime.fromisoformat(start) if start else None
    e = datetime.fromisoformat(end) if end else None
    out = crud.report_pnl(session, start=s, end=e)
    return out


@app.get('/api/reports/person')
def reports_person(party_id: Optional[str] = None, party_name: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    from datetime import datetime
    s = datetime.fromisoformat(start) if start else None
    e = datetime.fromisoformat(end) if end else None
    out = crud.report_person_turnover(session, party_id=party_id, party_name=party_name, start=s, end=e)
    return out


@app.get('/api/reports/stock')
def reports_stock(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.report_stock_valuation(session)
    return out


@app.get('/api/reports/cash')
def reports_cash(method: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.report_cash_balance(session, method=method)
    return out


@app.get('/api/dashboard/summary')
def dashboard_summary(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    out = crud.dashboard_summary(session)
    return out


@app.get('/api/dashboard/sales-trends')
def dashboard_sales_trends(days: Optional[int] = 30, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    out = crud.dashboard_sales_trends(session, days=days)
    return out


@app.get('/api/dashboard/old-stock')
def dashboard_old_stock(days: Optional[int] = 90, min_qty: Optional[int] = 1, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.dashboard_old_stock(session, days=days, min_qty=min_qty)
    return out


@app.get('/api/dashboard/checks-due')
def dashboard_checks_due(within_days: Optional[int] = 14, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.dashboard_checks_due(session, within_days=within_days)
    return out


@app.get('/api/dashboard/prices')
def dashboard_prices(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Viewer'])(current)
    out = crud.dashboard_currency_prices()
    return out


@app.post('/api/search')
def api_search(payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    q = payload.get('q') if isinstance(payload, dict) else None
    if not q:
        raise HTTPException(status_code=400, detail='q required')
    indexes = payload.get('indexes') if isinstance(payload, dict) else None
    filters = payload.get('filters') if isinstance(payload, dict) else None
    limit = int(payload.get('limit') or 10)
    try:
        res = search_multi(q, indexes=indexes, filters=filters, limit=limit)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/admin/ai_reports/run', response_model=schemas.AIReportOut)
def run_ai_report(start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    from .ai_analyzer import analyze_period, run_and_persist
    from datetime import datetime
    s = None
    e = None
    if start:
        try:
            s = datetime.fromisoformat(start)
        except Exception:
            s = None
    if end:
        try:
            e = datetime.fromisoformat(end)
        except Exception:
            e = None
    rep = run_and_persist(session, start=s, end=e)
    return rep


@app.get('/api/admin/ai_reports', response_model=list[schemas.AIReportOut])
def list_ai_reports(limit: Optional[int] = 50, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    reps = crud.get_ai_reports(session, limit=int(limit or 50))
    return reps


@app.post('/api/backups/manual', response_model=schemas.BackupOut)
def manual_backup(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    try:
        bk = crud.create_backup(session, created_by=current.id, kind='manual', note=f'Manual backup by {current.username}')
        return bk
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/backups', response_model=list[schemas.BackupOut])
def list_backups(limit: Optional[int] = 100, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    return crud.list_backups(session, limit=int(limit or 100))


@app.get('/api/backups/{bid}/download')
def download_backup(bid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    bk = crud.get_backup(session, bid)
    if not bk:
        raise HTTPException(status_code=404, detail='Backup not found')
    from fastapi.responses import FileResponse
    return FileResponse(bk.file_path, filename=bk.filename or 'backup.json')


@app.post('/api/financial-years', response_model=schemas.FinancialYearOut)
def create_financial_year(payload: schemas.FinancialYearIn, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    try:
        fy = crud.create_financial_year(session, name=payload.name, start_date=payload.start_date.isoformat(), end_date=payload.end_date.isoformat() if payload.end_date else None)
        return fy
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/financial-years', response_model=list[schemas.FinancialYearOut])
def list_financial_years(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    return crud.get_financial_years(session)


@app.post('/api/financial-years/{fid}/close', response_model=schemas.FinancialYearOut)
def close_financial_year_endpoint(fid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    fy = crud.close_financial_year(session, fid, create_rollover=True, closed_by=current.id)
    if not fy:
        raise HTTPException(status_code=404, detail='Financial year not found')
    return fy


@app.get('/api/admin/ai_reports/{rid}', response_model=schemas.AIReportOut)
def get_ai_report(rid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    r = crud.get_ai_report(session, rid)
    if not r:
        raise HTTPException(status_code=404, detail='Report not found')
    return r


@app.patch('/api/admin/ai_reports/{rid}', response_model=schemas.AIReportOut)
def review_ai_report(rid: int, payload: schemas.AIReportReview, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    status = payload.status
    if status not in ['approved', 'dismissed', 'reviewed']:
        raise HTTPException(status_code=400, detail='invalid status')
    rep = crud.review_ai_report(session, rid, status=status, reviewer_id=current.id if hasattr(current, 'id') else None)
    if not rep:
        raise HTTPException(status_code=404, detail='Report not found')
    # log the review action
    try:
        log_activity(session, current.username if hasattr(current, 'username') else None, f"بررسی گزارش هوش مصنوعی {rid} - وضعیت: {status}", path=f"/api/admin/ai_reports/{rid}", method='PATCH', status_code=200, detail={'note': payload.note})
    except Exception:
        pass
    return rep


@app.get('/api/search/live')
def api_search_live(q: Optional[str] = None, index: Optional[str] = 'products', limit: Optional[int] = 7, current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    if not q:
        return {'hits': []}
    hits = suggest_live(q, index=index, limit=limit)
    return {'hits': hits}


@app.post("/api/products", response_model=ProductOut)
def api_create_product(p: ProductCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # basic RBAC: only Accountant or Admin can create products
    require_roles(role_names=["Admin", "Accountant"])(current)
    prod = crud.create_product(session, p)
    return prod


@app.get("/api/products")
def api_get_products(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # viewers and above can list
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    return crud.get_products(session, q=q)



@app.post('/api/products/external/search')
def api_products_external_search(payload: ExternalSearchRequest, current: models.User = Depends(get_current_user)):
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


@app.post('/api/products/external/save', response_model=ProductOut)
def api_products_external_save(payload: SaveExternalProductRequest, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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


@app.get('/api/products/{product_id}/movement')
def product_movement(product_id: str, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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


@app.post('/api/assistant/query', response_model=AssistantResponse)
def api_assistant_query(payload: AssistantRequest, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # execute assistant command on behalf of the current user if enabled
    res = None
    try:
        res = __import__('app.ai_assistant', fromlist=['']).run_assistant(session, current, payload.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not isinstance(res, dict):
        raise HTTPException(status_code=500, detail='assistant error')
    # map to AssistantResponse
    return AssistantResponse(ok=bool(res.get('ok')), message=res.get('message', ''), data={k: v for k, v in res.items() if k not in ('ok', 'message')})


@app.post('/api/assistant/toggle', response_model=schemas.UserOut)
def api_assistant_toggle(payload: AssistantToggle, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # allow user to toggle their own assistant
    try:
        u = crud.set_assistant_enabled(session, current.id, bool(payload.enabled))
        # log action
        try:
            log_activity(session, current.username if hasattr(current, 'username') else None, f"تغییر وضعیت دستیار به {payload.enabled}")
        except Exception:
            pass
        return u
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/exports/invoice/{invoice_id}')
def api_export_invoice(invoice_id: int, format: Optional[str] = 'pdf', session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    try:
        if format == 'pdf':
            path = export_invoice_pdf(session, invoice_id)
        elif format == 'csv':
            path = export_invoice_csv(session, invoice_id)
        elif format in ('xls','xlsx'):
            path = export_invoice_excel(session, invoice_id)
        else:
            raise HTTPException(status_code=400, detail='unsupported format')
        # create share token
        import secrets
        token = secrets.token_urlsafe(18)
        filename = os.path.basename(path)
        # default expiry 24h
        from datetime import datetime, timedelta
        expires = datetime.utcnow() + timedelta(hours=24)
        sf = crud.create_shared_file(session, token=token, file_path=path, filename=filename, created_by=current.id, expires_at=expires.isoformat())
        link = f"/api/exports/shared/{token}"
        return {'token': token, 'download_url': link, 'expires_at': sf.expires_at}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/exports/shared/{token}')
def download_shared_file(token: str):
    # public download of shared file if not expired
    # create a short-lived session to lookup the shared file
    sf = crud.get_shared_file_by_token(DB.SessionLocal(), token)
    if not sf:
        raise HTTPException(status_code=404, detail='not found')
    from datetime import datetime
    if sf.expires_at and sf.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail='expired')
    # serve file
    from fastapi.responses import FileResponse
    return FileResponse(sf.file_path, filename=sf.filename or os.path.basename(sf.file_path))


@app.get('/api/prints/invoice/{invoice_id}', response_class=HTMLResponse)
def print_invoice_html(invoice_id: int):
    """Return a responsive HTML invoice template that will fetch invoice JSON and render for print."""
    tpl = os.path.join(os.path.dirname(__file__), '..', 'templates', 'invoice.html')
    if not os.path.exists(tpl):
        raise HTTPException(status_code=404, detail='template not found')
    return FileResponse(tpl, media_type='text/html')


@app.post("/api/persons", response_model=PersonOut)
def api_create_person(p: PersonCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=["Admin", "Accountant"])(current)
    person = crud.create_person(session, p)
    return person


@app.get("/api/persons")
def api_get_persons(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    return crud.get_persons(session, q=q)


@app.get('/api/financial/auto-context')
def get_financial_auto_context(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Get smart financial context - auto-creates current financial year and provides date suggestions"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    try:
        from .financial_automation import auto_determine_financial_context, get_smart_date_suggestions
        
        context = auto_determine_financial_context(session)
        suggestions = get_smart_date_suggestions(session)
        
        return {
            "context": context,
            "date_suggestions": suggestions,
            "blockchain_ready": True,  # هنگامی که در آینده با blockchain ادغام شود
            "auto_managed": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/financial/smart-year')
def create_smart_financial_year(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Auto-create financial year based on current Jalali calendar"""
    require_roles(role_names=['Admin'])(current)
    try:
        from .financial_automation import get_or_create_current_financial_year
        
        fy = get_or_create_current_financial_year(session)
        
        return {
            "financial_year": {
                "id": fy.id,
                "name": fy.name,
                "start_date": fy.start_date.isoformat() if fy.start_date else None,
                "end_date": fy.end_date.isoformat() if fy.end_date else None,
                "is_closed": fy.is_closed
            },
            "auto_created": True,
            "blockchain_compatible": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Users Management Endpoints ====================

@app.get('/api/roles', response_model=List[schemas.RoleOut])
async def list_roles(current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    """لیست تمام نقش ها - فقط Admin"""
    return crud.get_all_roles(session)


@app.get('/api/permissions', response_model=List[schemas.PermissionOut])
async def list_permissions(module: Optional[str] = None, current: models.User = Depends(require_roles(role_names=['Admin'])), session: Session = Depends(db.get_db)):
    """لیست تمام permissions - فقط Admin"""
    if module:
        return crud.get_permissions_by_module(session, module)
    return crud.get_all_permissions(session)


@app.get('/api/users', response_model=List[schemas.UserOut])
async def list_users(current: models.User = Depends(require_roles(role_names=['Admin'])), session: Session = Depends(db.get_db)):
    """لیست تمام کاربران - فقط Admin"""
    users = session.query(models.User).all()
    return users


@app.post('/api/users', response_model=schemas.UserOut)
async def create_user_endpoint(
    user: schemas.UserCreate,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
):
    """ایجاد کاربر جدید - فقط Admin"""
    
    # بررسی وجود کاربر
    existing = crud.get_user_by_username(session, user.username)
    if existing:
        raise HTTPException(status_code=400, detail='نام کاربری از قبل موجود است')
    
    # ایجاد کاربر جدید
    from .security import get_password_hash
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        role_id=user.role_id,
        role='User',  # Legacy field
        is_active=True
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    log_activity(session, current.id, f'/api/users', 'POST', 201, f'کاربر {user.username} ایجاد شد')
    return db_user


@app.patch('/api/users/{user_id}', response_model=schemas.UserOut)
async def update_user(
    user_id: int,
    update_data: schemas.UserUpdate,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
):
    """ویرایش کاربر - فقط Admin"""
    
    user = session.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='کاربر یافت نشد')
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)
    
    session.commit()
    session.refresh(user)
    
    log_activity(session, current.id, f'/api/users/{user_id}', 'PATCH', 200, f'کاربر {user.username} ویرایش شد')
    return user


@app.delete('/api/users/{user_id}')
async def delete_user(
    user_id: int,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
):
    """حذف کاربر - فقط Admin"""
    
    if user_id == current.id:
        raise HTTPException(status_code=400, detail='نمی‌توانید خودتان را حذف کنید')
    
    user = session.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='کاربر یافت نشد')
    
    username = user.username
    session.delete(user)
    session.commit()
    
    log_activity(session, current.id, f'/api/users/{user_id}', 'DELETE', 200, f'کاربر {username} حذف شد')
    return {'detail': 'کاربر حذف شد'}


@app.get('/api/current-user/permissions', response_model=List[schemas.PermissionOut])
async def get_current_user_permissions(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت permissions کاربر فعلی"""
    if current.role_id:
        role = crud.get_role(session, current.role_id)
        if role:
            return role.permissions
    return []


@app.get('/api/current-user/modules', response_model=List[str])
async def get_current_user_modules(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت ماژول های قابل دسترس برای کاربر فعلی"""
    if current.role_id:
        role = crud.get_role(session, current.role_id)
        if role:
            modules = set(p.module for p in role.permissions if p.module)
            # If user has any report-related permission, expose the dedicated 'reports' module
            try:
                if any('report' in (p.name or '').lower() for p in role.permissions):
                    modules.add('reports')
            except Exception:
                pass
            return list(modules)
    return []

