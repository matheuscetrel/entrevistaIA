"""
Question and Answer schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime


class QuestionBase(BaseModel):
    question_text: str
    question_type: str
    category: Optional[str] = None
    difficulty: str = "medium"


class QuestionCreate(QuestionBase):
    interview_id: int
    order_number: int


class QuestionResponse(QuestionBase):
    id: int
    interview_id: int
    order_number: int
    expected_duration_seconds: int
    ai_generated: bool
    created_at: datetime
    asked_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class GenerateQuestionRequest(BaseModel):
    """Request schema for generating a question"""
    language: Optional[str] = "en-US"  # Default to English


class AnswerBase(BaseModel):
    answer_text: str
    answer_method: str = "text"


class AnswerCreate(AnswerBase):
    question_id: int
    time_taken_seconds: Optional[int] = None


class AudioAnswerCreate(BaseModel):
    """Schema for submitting audio answer"""
    question_id: int
    audio_data: str  # Base64 encoded audio
    audio_format: str = "webm"  # webm, mp4, etc.
    time_taken_seconds: Optional[int] = None


class AnswerUpdate(BaseModel):
    score: Optional[int] = Field(None, ge=0, le=100)
    feedback: Optional[Dict] = None
    sentiment_score: Optional[int] = Field(None, ge=-100, le=100)


class AnswerResponse(AnswerBase):
    id: int
    question_id: int
    time_taken_seconds: Optional[int] = None
    analyzed: bool
    score: Optional[int] = None
    feedback: Optional[Dict] = None
    sentiment_score: Optional[int] = None
    keywords: Optional[List[str]] = None
    created_at: datetime
    analyzed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class FeedbackResponse(BaseModel):
    score: int
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    overall_comment: str
