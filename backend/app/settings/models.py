from datetime import datetime
from sqlalchemy import Column, Integer, Text, DateTime, String, Boolean
from app.db import Base


class AppSettings(Base):
    __tablename__ = 'app_settings'
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    data = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsSettings(Base):
    __tablename__ = 'sms_settings'
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(32), nullable=False, default='ippanel')
    base_url = Column(String(256), nullable=False, default='https://edge.ippanel.com/v1')
    api_key_masked = Column(String(256), nullable=True)
    default_sender = Column(String(64), nullable=True)
    enabled = Column(Boolean, nullable=False, default=False)
    low_credit_threshold = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsTemplate(Base):
    __tablename__ = 'sms_templates'
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), nullable=False, unique=True, index=True)
    pattern_id = Column(String(128), nullable=True)
    text = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsLog(Base):
    __tablename__ = 'sms_logs'
    id = Column(Integer, primary_key=True, index=True)
    event_code = Column(String(64), nullable=True, index=True)
    recipient = Column(String(32), nullable=False, index=True)
    body_preview = Column(Text, nullable=True)
    provider_message_id = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default='queued')
    error_message = Column(Text, nullable=True)
    meta = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
