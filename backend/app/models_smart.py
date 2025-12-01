from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class SmartAssistantSettings(Base):
    __tablename__ = 'smart_assistant_settings'
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(32), nullable=False, default='openai')
    base_url = Column(String(256), nullable=True)
    api_key_masked = Column(String(256), nullable=True)
    model_name = Column(String(128), nullable=True, default='gpt-4.1')
    language = Column(String(8), nullable=False, default='fa')
    enable_doc_understanding = Column(Boolean, nullable=False, default=True)
    enable_journal_suggestions = Column(Boolean, nullable=False, default=True)
    enable_alerts = Column(Boolean, nullable=False, default=False)
    max_tokens = Column(Integer, nullable=True)
    temperature = Column(Integer, nullable=True)
    top_p = Column(Integer, nullable=True)
    enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmartAssistantSession(Base):
    __tablename__ = 'smart_assistant_sessions'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=True)
    meta = Column(Text, nullable=True)  # JSON blob
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    messages = relationship("SmartAssistantMessage", back_populates="session", cascade="all, delete-orphan")


class SmartAssistantMessage(Base):
    __tablename__ = 'smart_assistant_messages'
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('smart_assistant_sessions.id'), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    meta = Column(Text, nullable=True)  # JSON blob
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    session = relationship("SmartAssistantSession", back_populates="messages")
