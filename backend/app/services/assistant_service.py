import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app import schemas
from app.models_smart import SmartAssistantSettings, SmartAssistantSession, SmartAssistantMessage
from app.services import ai_client


def _mask(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    return "****" + key[-4:]


def get_settings(session: Session) -> SmartAssistantSettings:
    st = session.query(SmartAssistantSettings).first()
    if not st:
        st = SmartAssistantSettings()
        session.add(st)
        session.commit()
        session.refresh(st)
    return st


def save_settings(session: Session, data: Dict[str, Any]) -> SmartAssistantSettings:
    st = get_settings(session)
    for field in [
        "provider",
        "base_url",
        "model_name",
        "language",
        "enable_doc_understanding",
        "enable_journal_suggestions",
        "enable_alerts",
        "max_tokens",
        "temperature",
        "top_p",
        "enabled",
    ]:
        if field in data and data[field] is not None:
            setattr(st, field, data[field])
    if data.get("api_key"):
        st.api_key_masked = _mask(data["api_key"])
    st.updated_at = datetime.utcnow()
    session.add(st)
    session.commit()
    session.refresh(st)
    return st


def health(session: Session) -> Dict[str, Any]:
    st = get_settings(session)
    api_key = os.getenv("AI_API_KEY")
    if not api_key and st.enabled:
        return {"status": "error", "message": "کلید API تنظیم نشده است."}
    if not st.enabled:
        return {"status": "disabled", "message": "دستیار غیرفعال است."}
    try:
        ai_client.call_chat(
            messages=[{"role": "user", "content": "ping"}],
            model=st.model_name,
            base_url=st.base_url,
            api_key=api_key,
            max_tokens=5,
        )
        return {"status": "ok", "provider": st.provider, "api_key_masked": st.api_key_masked}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


def chat(session: Session, payload: schemas.AssistantChatRequest) -> schemas.AssistantChatResponse:
    st = get_settings(session)
    api_key = os.getenv("AI_API_KEY")
    if not st.enabled and not api_key:
        disabled_msg = "دستیار هوشمند غیرفعال است."
        return schemas.AssistantChatResponse(reply=disabled_msg, session_id=None, mode=payload.mode)

    sess = None
    if payload.session_id:
        sess = session.query(SmartAssistantSession).filter(SmartAssistantSession.id == payload.session_id).first()
    if not sess:
        sess = SmartAssistantSession(title=payload.title or "گفتگو")
        session.add(sess)
        session.commit()
        session.refresh(sess)

    messages = (
        session.query(SmartAssistantMessage)
        .filter(SmartAssistantMessage.session_id == sess.id)
        .order_by(SmartAssistantMessage.id.asc())
        .all()
    )
    chat_messages = [{"role": m.role, "content": m.content} for m in messages]
    chat_messages.append({"role": "user", "content": payload.message})
    try:
        resp = ai_client.call_chat(
            messages=chat_messages,
            model=st.model_name,
            base_url=st.base_url,
            api_key=api_key,
            temperature=st.temperature or 0.3,
            max_tokens=st.max_tokens or 400,
        )
        reply_text = resp.get("choices", [{}])[0].get("message", {}).get("content", "پاسخی دریافت نشد.")
    except Exception:
        reply_text = "خطا در ارتباط با سرویس هوشمند"

    user_msg = SmartAssistantMessage(session_id=sess.id, role="user", content=payload.message, created_at=datetime.utcnow())
    as_msg = SmartAssistantMessage(session_id=sess.id, role="assistant", content=reply_text, created_at=datetime.utcnow())
    session.add_all([user_msg, as_msg])
    session.commit()
    return schemas.AssistantChatResponse(reply=reply_text, session_id=sess.id, mode=payload.mode)


def analyze_document(file_bytes: bytes, filename: str, content_type: str, st: SmartAssistantSettings) -> schemas.DocumentAnalysisResult:
    doc_type = "invoice" if "pdf" in content_type or filename.lower().endswith(".pdf") else "unknown"
    return schemas.DocumentAnalysisResult(
        doc_type=doc_type,
        title=f"تحلیل {filename}",
        party={"name": "مشتری نمونه", "role": "customer"},
        date_issued=datetime.utcnow().date().isoformat(),
        items=[],
        totals={"subtotal": 0, "tax": 0, "grand_total": 0},
        confidence_scores={"overall": 0.5},
        suggested_journal=[],
    )


def suggest_journal_from_document(doc: schemas.DocumentAnalysisResult) -> List[schemas.JournalSuggestion]:
    suggestions: List[schemas.JournalSuggestion] = []
    total = doc.totals.grand_total if doc.totals else 0
    if total and total > 0 and doc.doc_type == "invoice":
        suggestions.append(
            schemas.JournalSuggestion(
                account_code="Sales",
                debit=0,
                credit=int(total),
                reason="ثبت فروش بر اساس مجموع فاکتور",
            )
        )
        suggestions.append(
            schemas.JournalSuggestion(
                account_code="AccountsReceivable",
                debit=int(total),
                credit=0,
                reason="حساب دریافتنی مرتبط با فروش",
            )
        )
    return suggestions
