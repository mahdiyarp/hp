from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.deps import get_current_user
from app.db import get_db
from app.activity_logger import log_activity

router = APIRouter()


@router.post('/query', response_model=schemas.AssistantResponse)
def api_assistant_query(payload: schemas.AssistantRequest, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    # execute assistant command on behalf of the current user if enabled
    res = None
    try:
        res = __import__('app.ai_assistant', fromlist=['']).run_assistant(session, current, payload.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not isinstance(res, dict):
        raise HTTPException(status_code=500, detail='assistant error')
    # map to AssistantResponse
    return schemas.AssistantResponse(ok=bool(res.get('ok')), message=res.get('message', ''), data={k: v for k, v in res.items() if k not in ('ok', 'message')})


@router.post('/toggle', response_model=schemas.UserOut)
def api_assistant_toggle(payload: schemas.AssistantToggle, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
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
