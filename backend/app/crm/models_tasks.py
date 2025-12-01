from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db import Base

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False, index=True)
    description = Column(String(2000))
    status = Column(String(50), index=True, default='todo')
    priority = Column(String(50), index=True, default='medium')
    due_date = Column(DateTime(timezone=True))
    assignee_id = Column(Integer, index=True)
    entity_type = Column(String(100), index=True)
    entity_id = Column(String(100), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
