"""
Interview schemas for request/response validation
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class InterviewTypeEnum(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"
    CUSTOM = "custom"


class InterviewStatusEnum(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InterviewBase(BaseModel):
    title: str
    interview_type: InterviewTypeEnum = InterviewTypeEnum.MIXED
    difficulty_level: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    job_role: Optional[str] = None
    company_context: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    company_name: Optional[str] = None
    technologies: Optional[List[str]] = None
    seniority: Optional[str] = "pleno"
    language: Optional[str] = "pt-BR"
    interview_metadata: Optional[Dict[str, Any]] = None

    @field_validator("seniority", mode="before")
    @classmethod
    def normalize_seniority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = str(value).strip().lower()
        aliases = {
            "estagio": "estagio",
            "estágio": "estagio",
            "intern": "estagio",
            "internship": "estagio",
            "junior": "junior",
            "júnior": "junior",
            "pleno": "pleno",
            "senior": "senior",
            "sênior": "senior",
            "especialista": "especialista",
            "specialist": "especialista",
        }
        return aliases.get(normalized, normalized)

    @model_validator(mode="after")
    def populate_interview_metadata(self):
        payload = dict(self.interview_metadata or {})

        if self.job_title is not None:
            payload["job_title"] = self.job_title
        if self.job_role is not None and "job_role" not in payload:
            payload["job_role"] = self.job_role
        if self.job_description is not None:
            payload["job_description"] = self.job_description
        if self.company_name is not None:
            payload["company_name"] = self.company_name
        if self.company_context is not None and "company_context" not in payload:
            payload["company_context"] = self.company_context
        if self.technologies is not None:
            payload["technologies"] = self.technologies
        if self.seniority is not None:
            payload["seniority"] = self.seniority
        if self.language is not None:
            payload["language"] = self.language

        if payload:
            self.interview_metadata = payload

        return self


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[InterviewStatusEnum] = None
    overall_score: Optional[int] = Field(None, ge=0, le=100)


class InterviewResponse(InterviewBase):
    id: int
    user_id: int
    status: InterviewStatusEnum
    total_questions: int
    answered_questions: int
    overall_score: Optional[int] = None
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewStats(BaseModel):
    total_interviews: int
    completed_interviews: int
    average_score: Optional[float] = None
    total_time_spent_minutes: int
