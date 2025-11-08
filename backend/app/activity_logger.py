import os
import logging
import json
from datetime import datetime
from typing import Optional, Any, Dict
import jdatetime

from . import db, models

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
LOG_FILE = os.path.join(LOG_DIR, 'activity.log')

# Configure file logger
logger = logging.getLogger('activity')
logger.setLevel(logging.INFO)
if not logger.handlers:
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        fh = logging.FileHandler(LOG_FILE, encoding='utf-8')
        fmt = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except Exception:
        # fallback to default
        logging.basicConfig()


def _format_persian(user_display: Optional[str], operation: str, ref: Optional[str] = None, when: Optional[datetime] = None) -> str:
    """Return Persian formatted activity string.
    Example:
    👤 کاربر #رضا | عملیات: صدور فاکتور #S-20251108-000123 | تاریخ: 1404/08/20 ساعت 15:32
    """
    when = when or datetime.utcnow()
    # convert to Jalali using jdatetime
    try:
        j = jdatetime.datetime.fromgregorian(datetime=when)
        date_part = f"{j.year:04d}/{j.month:02d}/{j.day:02d}"
        time_part = f"{j.hour:02d}:{j.minute:02d}"
    except Exception:
        date_part = when.strftime('%Y/%m/%d')
        time_part = when.strftime('%H:%M')
    user_part = f"#{user_display}" if user_display else '#ناشناس'
    ref_part = f" | مرجع: {ref}" if ref else ''
    return f"👤 کاربر {user_part} | عملیات: {operation}{ref_part} | تاریخ: {date_part} ساعت {time_part}"


def log_activity(db_session: Optional[Any], user_display: Optional[str], operation: str, path: Optional[str] = None, method: Optional[str] = None, status_code: Optional[int] = None, detail: Optional[Dict] = None):
    """Write a formatted activity entry to DB (audit_logs.detail) and to activity.log file.
    If db_session is None, a new session will be created for the DB write.
    """
    try:
        when = datetime.utcnow()
        message = _format_persian(user_display, operation, ref=None, when=when)
        # append path/method/status to detail
        payload = {
            'path': path,
            'method': method,
            'status_code': status_code,
            'extra': detail,
        }
        # write to file
        try:
            logger.info(message + ' | ' + json.dumps(payload, ensure_ascii=False))
        except Exception:
            logger.info(message)
        # write to DB
        wrote = False
        try:
            close_after = False
            if db_session is None:
                db_session = db.SessionLocal()
                close_after = True
            entry = models.AuditLog(
                user_id=None,
                path=path or '/',
                method=method or 'GET',
                status_code=status_code,
                detail=(message + '\n' + json.dumps(payload, ensure_ascii=False)),
            )
            # if user_display looks like '#username' or contains a hash, try to map to a user id
            try:
                if user_display:
                    # attempt to resolve username without leading #
                    uname = user_display.lstrip('#')
                    u = db_session.query(models.User).filter(models.User.username == uname).first()
                    if u:
                        entry.user_id = u.id
            except Exception:
                pass
            db_session.add(entry)
            db_session.commit()
            wrote = True
        finally:
            if 'close_after' in locals() and close_after:
                try:
                    db_session.close()
                except Exception:
                    pass
    except Exception:
        # never raise from logger
        pass


def log_request(request, response, username: Optional[str] = None):
    try:
        path = getattr(request, 'url').path if hasattr(request, 'url') else getattr(request, 'path', None)
        method = getattr(request, 'method', None)
        status = getattr(response, 'status_code', None)
        operation = f"درخواست {method} {path}"
        log_activity(None, username, operation, path=path, method=method, status_code=status, detail=None)
    except Exception:
        pass
