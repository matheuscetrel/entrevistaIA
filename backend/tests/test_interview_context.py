from app.schemas.interview import InterviewCreate


def test_interview_create_keeps_vacancy_context():
    payload = {
        "title": "Senior Python Engineer",
        "job_title": "Senior Python Engineer",
        "job_description": "Build and maintain FastAPI services with SQLAlchemy and Celery.",
        "company_name": "Mentora.ai",
        "technologies": ["Python", "FastAPI", "SQLAlchemy"],
        "seniority": "senior",
        "language": "pt-BR",
        "difficulty_level": "advanced",
        "interview_type": "technical",
    }

    interview = InterviewCreate(**payload)

    assert interview.job_title == "Senior Python Engineer"
    assert interview.company_name == "Mentora.ai"
    assert interview.job_description == "Build and maintain FastAPI services with SQLAlchemy and Celery."
    assert interview.technologies == ["Python", "FastAPI", "SQLAlchemy"]
    assert interview.seniority == "senior"
    assert interview.language == "pt-BR"
    assert interview.interview_metadata == {
        "job_title": "Senior Python Engineer",
        "job_description": "Build and maintain FastAPI services with SQLAlchemy and Celery.",
        "company_name": "Mentora.ai",
        "technologies": ["Python", "FastAPI", "SQLAlchemy"],
        "seniority": "senior",
        "language": "pt-BR",
    }
