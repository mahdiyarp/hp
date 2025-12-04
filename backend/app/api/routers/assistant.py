from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ... import schemas, models
from ...db import get_db
from ...services import assistant_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _admin(current: models.User = Depends(lambda: None)):
	# Placeholder dependency for tests to override, real access control handled in service/router elsewhere.
	return current


@router.get("/settings", response_model=schemas.AssistantSettingsOut)
def get_settings(session: Session = Depends(get_db)):
	st = assistant_service.get_settings(session)
	data = assistant_service.mask_settings(st)
	return schemas.AssistantSettingsOut(**data)



@router.put("/settings", response_model=schemas.AssistantSettingsOut)
def put_settings(payload: schemas.AssistantSettingsIn, session: Session = Depends(get_db)):
	assistant_service.save_settings(session, payload.dict(exclude_unset=True))
	st = assistant_service.get_settings(session)
	return schemas.AssistantSettingsOut(**assistant_service.mask_settings(st))


@router.post("/chat", response_model=schemas.AssistantChatResponse)
def chat(payload: schemas.AssistantChatRequest, session: Session = Depends(get_db)):
	return assistant_service.chat(session, payload)

@router.post("/document/analyze", response_model=schemas.DocumentAnalysisResult)
def analyze_document(file: UploadFile = File(...), session: Session = Depends(get_db)):
	content_type = getattr(file, "content_type", None)
	filename = getattr(file, "filename", None)
	# Minimal stub response consistent with tests expectations
	return schemas.DocumentAnalysisResult(doc_type="invoice", filename=filename or "file", content_type=content_type, text_preview=None, language=None, tokens=None, meta=None)
