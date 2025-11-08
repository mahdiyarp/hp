from datetime import datetime, timedelta
import json
from typing import Optional, Dict, Any, List
from . import db, models
import re
import jdatetime

THRESHOLD_LARGE_AMOUNT = 10_000_000  # configurable


def _to_jalali_str(dt: datetime) -> str:
    try:
        j = jdatetime.datetime.fromgregorian(datetime=dt)
        return f"{j.year:04d}/{j.month:02d}/{j.day:02d} {j.hour:02d}:{j.minute:02d}"
    except Exception:
        return dt.isoformat()


def _extract_numbers(text: str) -> List[int]:
    if not text:
        return []
    trans = str.maketrans('۰۱۲۳۴۵۶۷۸۹٫،', '0123456789.,')
    t = text.translate(trans)
    nums = re.findall(r"(\d[\d,\.\s]{0,20}\d)", t)
    out = []
    for n in nums:
        n2 = re.sub(r"[^0-9]", "", n)
        try:
            out.append(int(n2))
        except Exception:
            pass
    return out


def analyze_period(db_session, start: Optional[datetime] = None, end: Optional[datetime] = None) -> Dict[str, Any]:
    """Run rule-based analysis over audit logs and invoices/payments in the given period.
    Returns a dict with summary (Persian) and findings (list).
    """
    now = datetime.utcnow()
    if end is None:
        end = now
    if start is None:
        start = end - timedelta(days=1)
    findings = []
    # invoices summary
    inv_q = db_session.query(models.Invoice).filter(models.Invoice.server_time >= start, models.Invoice.server_time <= end)
    total_invoices = inv_q.count()
    finals = inv_q.filter(models.Invoice.status == 'final').all()
    total_final_invoices = len(finals)
    avg_amount = 0
    if total_final_invoices:
        avg_amount = sum((i.total or 0) for i in finals) // total_final_invoices
    # payments summary
    pay_q = db_session.query(models.Payment).filter(models.Payment.server_time >= start, models.Payment.server_time <= end)
    total_payments = pay_q.count()
    # audit log analysis for deletes/edits
    log_q = db_session.query(models.AuditLog).filter(models.AuditLog.created_at >= start, models.AuditLog.created_at <= end)
    logs = log_q.all()
    deletes_per_user = {}
    edits_large_changes = []
    for l in logs:
        detail = (l.detail or '')
        # detect deletion words
        if 'حذف' in detail or 'delete' in detail.lower() or 'removed' in detail.lower():
            uid = l.user_id or 0
            deletes_per_user[uid] = deletes_per_user.get(uid, 0) + 1
        # detect edits and numeric changes
        if 'ویرایش' in detail or 'تغییر' in detail or 'edit' in detail.lower() or 'update' in detail.lower():
            nums = _extract_numbers(detail)
            for n in nums:
                if n >= THRESHOLD_LARGE_AMOUNT:
                    edits_large_changes.append({'log_id': l.id, 'user_id': l.user_id, 'value': n, 'detail': detail})
    # suspicious users
    suspicious_users = []
    for uid, cnt in deletes_per_user.items():
        if cnt >= 3:
            # map to username
            uname = None
            try:
                if uid:
                    u = db_session.query(models.User).filter(models.User.id == uid).first()
                    if u:
                        uname = u.username
            except Exception:
                pass
            suspicious_users.append({'user_id': uid, 'username': uname, 'deletes': cnt})
    # findings
    findings.append({'type': 'summary_counts', 'total_invoices': total_invoices, 'total_final_invoices': total_final_invoices, 'total_payments': total_payments, 'average_invoice_amount': int(avg_amount)})
    if suspicious_users:
        findings.append({'type': 'suspicious_deletes', 'users': suspicious_users})
    if edits_large_changes:
        findings.append({'type': 'large_edits', 'items': edits_large_changes})
    # formulate Persian summary
    start_j = _to_jalali_str(start)
    end_j = _to_jalali_str(end)
    summary_lines = []
    summary_lines.append(f"گزارش فعالیت کاربران برای بازه {start_j} تا {end_j}")
    summary_lines.append(f"تعداد فاکتورها: {total_invoices} (پایانی: {total_final_invoices})")
    summary_lines.append(f"تعداد پرداخت‌ها: {total_payments}")
    summary_lines.append(f"میانگین مبلغ فاکتورهای پایانی: {avg_amount} ریال")
    if suspicious_users:
        summary_lines.append(f"هشدار: حذف‌های غیرعادی توسط کاربران شناسایی شد: {len(suspicious_users)} نفر")
    if edits_large_changes:
        summary_lines.append(f"هشدار: ویرایش‌های با تغییر مبلغ بزرگ شناسایی شد: {len(edits_large_changes)} مورد")
    summary = '\n'.join(summary_lines)
    return {'start': start.isoformat(), 'end': end.isoformat(), 'summary': summary, 'findings': findings}


def run_and_persist(db_session, start: Optional[datetime] = None, end: Optional[datetime] = None):
    res = analyze_period(db_session, start=start, end=end)
    # persist AIReport
    try:
        rep = models.AIReport(summary=res['summary'], findings=json.dumps(res['findings'], ensure_ascii=False))
        db_session.add(rep)
        db_session.commit()
        db_session.refresh(rep)
        return rep
    except Exception:
        db_session.rollback()
        raise
