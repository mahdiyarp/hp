from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db

router = APIRouter()


@router.post('/send-sms')
async def test_send_sms(
    payload: dict,  # {'mobile': '...', 'message': '...'}
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """تست ارسال SMS (فقط برای Admin)"""
    if current.role_id != 1:  # فقط Admin
        raise HTTPException(status_code=403, detail='فقط Admin می‌تواند SMS را تست کند')
    
    mobile = payload.get('mobile', '').strip()
    message = payload.get('message', '').strip()
    
    if not mobile or not message:
        raise HTTPException(status_code=400, detail='mobile و message الزامی است')
    
    from app.sms import send_sms
    success, msg = send_sms(session, mobile, message)
    
    return {
        'success': success,
        'message': msg,
        'mobile': mobile,
        'text': message
    }
