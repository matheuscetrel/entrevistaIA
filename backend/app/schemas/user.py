"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    cpf: str = Field(..., min_length=11, max_length=14)
    security_question: str
    security_answer: str = Field(..., min_length=2)


class SecurityQuestionRequest(BaseModel):
    email: EmailStr


class SecurityQuestionResponse(BaseModel):
    security_question: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    cpf: str
    security_answer: str
    new_password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(
        default=None,
        min_length=8,
    )


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class TokenData(BaseModel):
    user_id: Optional[int] = None