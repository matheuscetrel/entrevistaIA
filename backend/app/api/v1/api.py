"""
API v1 router aggregator
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, interviews, questions

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["Interviews"])
api_router.include_router(questions.router, prefix="/questions", tags=["Questions & Answers"])
