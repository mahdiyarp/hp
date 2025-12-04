from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import get_current_user
from app.db import get_db
from app.activity_logger import log_activity

router = APIRouter()


@router.get('/keys', response_model=List[schemas.DeveloperApiKeyOut])
async def list_api_keys(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت تمام کلیدهای API کاربر"""
    keys = crud.get_user_api_keys(session, current.id)
    return keys


@router.post('/keys', response_model=schemas.DeveloperApiKeyWithKey)
async def create_api_key(
    payload: schemas.DeveloperApiKeyCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """ایجاد کلید API جدید"""
    api_key, plain_key = crud.create_api_key(session, current.id, payload)
    
    log_activity(session, current.id, '/api/developer/keys', 'POST', 201, 
                f'کلید API جدید {api_key.name} ایجاد شد')
    
    return {
        'id': api_key.id,
        'user_id': api_key.user_id,
        'name': api_key.name,
        'description': api_key.description,
        'enabled': api_key.enabled,
        'rate_limit_per_minute': api_key.rate_limit_per_minute,
        'endpoints': api_key.endpoints,
        'last_used_at': api_key.last_used_at,
        'created_at': api_key.created_at,
        'expires_at': api_key.expires_at,
        'revoked_at': api_key.revoked_at,
        'api_key': plain_key  # Only shown once on creation
    }


@router.put('/keys/{key_id}', response_model=schemas.DeveloperApiKeyOut)
async def update_api_key(
    key_id: int,
    payload: schemas.DeveloperApiKeyUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی تنظیمات کلید API"""
    api_key = crud.get_api_key(session, key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail='کلید API یافت نشد')
    
    if api_key.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به ویرایش این کلید نیستید')
    
    api_key = crud.update_api_key(session, key_id, payload)
    
    log_activity(session, current.id, f'/api/developer/keys/{key_id}', 'PUT', 200, 
                f'کلید API {api_key.name} به‌روزرسانی شد')
    
    return api_key


@router.post('/keys/{key_id}/rotate', response_model=schemas.ApiKeyRotateResponse)
async def rotate_api_key(
    key_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """تولید کلید API جدید (لغو کلید قدیم)"""
    old_key = crud.get_api_key(session, key_id)
    
    if not old_key:
        raise HTTPException(status_code=404, detail='کلید API یافت نشد')
    
    if old_key.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به چرخش این کلید نیستید')
    
    new_key, plain_key = crud.rotate_api_key(session, key_id)
    
    log_activity(session, current.id, f'/api/developer/keys/{key_id}/rotate', 'POST', 200, 
                f'کلید API {old_key.name} چرخش داده شد')
    
    return {
        'message': 'کلید API با موفقیت چرخش داده شد',
        'old_key_id': key_id,
        'new_key_id': new_key.id,
        'new_api_key': plain_key
    }


@router.delete('/keys/{key_id}')
async def revoke_api_key(
    key_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """لغو (حذف) کلید API"""
    api_key = crud.get_api_key(session, key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail='کلید API یافت نشد')
    
    if api_key.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به حذف این کلید نیستید')
    
    success = crud.revoke_api_key(session, key_id)
    
    if success:
        log_activity(session, current.id, f'/api/developer/keys/{key_id}', 'DELETE', 200, 
                    f'کلید API {api_key.name} لغو شد')
        return {'detail': 'کلید API لغو شد'}
    
    raise HTTPException(status_code=500, detail='لغو ناموفق بود')


@router.get('/endpoints')
async def list_available_endpoints(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت فهرست endpoints دسترس‌پذیر برای دیولوپرها"""
    endpoints = [
        {
            'path': '/api/external/fx-rates',
            'method': 'GET',
            'description': 'نرخ ارز (USD, EUR, GBP, etc.)',
            'requires_api_key': True,
            'rate_limit': '100/min'
        },
        {
            'path': '/api/external/crypto-prices',
            'method': 'GET',
            'description': 'قیمت رمزارز (BTC, ETH, etc.)',
            'requires_api_key': True,
            'rate_limit': '100/min'
        },
        {
            'path': '/api/external/ai/product-match',
            'method': 'POST',
            'description': 'تطابق خودکار کالا با AI',
            'requires_api_key': True,
            'rate_limit': '50/min'
        },
        {
            'path': '/api/external/ai/invoice-analysis',
            'method': 'POST',
            'description': 'تحلیل فاکتور با OCR و AI',
            'requires_api_key': True,
            'rate_limit': '20/min'
        },
        {
            'path': '/api/invoices',
            'method': 'GET',
            'description': 'دریافت فاکتورها',
            'requires_api_key': True,
            'rate_limit': '200/min'
        },
        {
            'path': '/api/products',
            'method': 'GET',
            'description': 'دریافت کالاها',
            'requires_api_key': True,
            'rate_limit': '200/min'
        }
    ]
    
    return {'endpoints': endpoints}
