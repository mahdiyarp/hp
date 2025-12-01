from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db import Base

class Person(Base):
    __tablename__ = 'persons'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    national_id = Column(String(50), index=True)
    phone = Column(String(50), index=True)
    email = Column(String(200), index=True)
    address = Column(String(500))
    status = Column(String(50), default='active', index=True)
    tags = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
