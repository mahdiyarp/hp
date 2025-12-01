from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db import Base


"""
Contact model for CRM. Note: Account model is defined in app.models.
"""


class Contact(Base):
    __tablename__ = 'contacts'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    national_id = Column(String(64))
    phone = Column(String(64), index=True)
    email = Column(String(255), index=True)
    company = Column(String(255), index=True)
    customer_type = Column(String(32))  # enum-like
    tags = Column(Text)  # comma-separated
    address = Column(Text)
    website = Column(String(255))
    notes = Column(Text)
    status = Column(String(32), default='active')
    rating_score = Column(Integer, default=0)
    blockchain_hash = Column(String(128))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    account_id = Column(String(128), ForeignKey('accounts.id'))
    account = relationship('Account')
