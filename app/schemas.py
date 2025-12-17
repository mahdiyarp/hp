"""
Compatibility layer to ensure tests importing app.schemas get the backend schemas.
If backend package is not importable, fallback to local definitions.
"""
import importlib
try:

    # Backward-compat for assistant document analysis tests
    # This class already exists in the fallback section, so we are not adding it again.
    backend_schemas = importlib.import_module('backend.app.schemas')
    # Re-export everything from backend.app.schemas
    globals().update({k: getattr(backend_schemas, k) for k in dir(backend_schemas) if not k.startswith('_')})
except ModuleNotFoundError:
    # Fallback: minimal shims to satisfy tests
    from pydantic import BaseModel
    from typing import Optional

    class AssistantChatRequest(BaseModel):
        text: str
        context: Optional[dict] = None

    class AssistantChatResponse(BaseModel):
        ok: bool
        message: Optional[str] = None
        data: Optional[dict] = None

    class DocumentAnalysisResult(BaseModel):
        ok: bool
        message: Optional[str] = None
        data: Optional[dict] = None

    # Backward-compat input for SMS settings API
    # This class already exists in the fallback section, so we are not adding it again.
    class SmsSettingsIn(BaseModel):
        api_key: Optional[str] = None
        sender_name: Optional[str] = None
        provider: Optional[str] = None
        enabled: Optional[bool] = None
        auto_sms_enabled: Optional[bool] = None
