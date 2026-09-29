"""
Interview model for storing interview sessions
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import Base


class InterviewStatus(str, enum.Enum):
    """Interview status enum"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InterviewType(str, enum.Enum):
    """Interview type enum"""
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"
    CUSTOM = "custom"


class Interview(Base):
    """Interview database model"""
    
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Interview details
    title = Column(String, nullable=False)
    interview_type = Column(Enum(InterviewType), default=InterviewType.MIXED)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.PENDING)
    
    # Configuration
    difficulty_level = Column(String, default="intermediate")  # beginner, intermediate, advanced
    job_role = Column(String, nullable=True)
    company_context = Column(Text, nullable=True)
    seniority = Column(String, nullable=True, default="pleno")  # estagio, junior, pleno, senior, especialista
    
    # Session data
    total_questions = Column(Integer, default=0)
    answered_questions = Column(Integer, default=0)
    
    # Scoring
    overall_score = Column(Integer, nullable=True)  # 0-100
    technical_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    
    # Metadata  (renamed from metadata to avoid SQLAlchemy conflict)
    interview_metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="interviews")
    questions = relationship("Question", back_populates="interview", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Interview(id={self.id}, title='{self.title}', status='{self.status}')>"
