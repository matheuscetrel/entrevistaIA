"""
Question and Answer models
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Question(Base):
    """Question database model"""
    
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    
    # Question content
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # technical, behavioral, situational
    category = Column(String, nullable=True)  # programming, algorithms, leadership, etc.
    difficulty = Column(String, default="medium")
    
    # Order and timing
    order_number = Column(Integer, nullable=False)
    expected_duration_seconds = Column(Integer, default=180)  # 3 minutes default
    
    # AI metadata
    ai_generated = Column(Boolean, default=True)
    generation_context = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    asked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    interview = relationship("Interview", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Question(id={self.id}, type='{self.question_type}')>"


class Answer(Base):
    """Answer database model"""
    
    __tablename__ = "answers"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, unique=True)
    
    # Answer content
    answer_text = Column(Text, nullable=False)
    answer_method = Column(String, default="text")  # text, voice
    
    # Timing
    time_taken_seconds = Column(Integer, nullable=True)
    
    # AI Analysis
    analyzed = Column(Boolean, default=False)
    score = Column(Integer, nullable=True)  # 0-100
    
    # Feedback from AI
    feedback = Column(JSON, nullable=True)  # {strengths: [], weaknesses: [], suggestions: []}
    
    # Sentiment and keywords
    sentiment_score = Column(Integer, nullable=True)  # -100 to 100
    keywords = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    question = relationship("Question", back_populates="answer")
    
    def __repr__(self):
        return f"<Answer(id={self.id}, score={self.score})>"
