"""
Interview API endpoints.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.interview import Interview, InterviewStatus
from app.models.user import User
from app.schemas.api_response import (
    ApiSuccessResponse,
    success_response,
)
from app.schemas.interview import (
    InterviewCreate,
    InterviewResponse,
    InterviewStats,
    InterviewUpdate,
)


router = APIRouter()


@router.post(
    "/",
    response_model=ApiSuccessResponse[InterviewResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_interview(
    interview_in: InterviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Cria uma nova sessão de entrevista.
    """

    seniority = interview_in.seniority or "pleno"
    normalized_difficulty = {
        "estagio": "beginner",
        "junior": "beginner",
        "pleno": "intermediate",
        "senior": "advanced",
        "especialista": "advanced",
    }.get(seniority, interview_in.difficulty_level or "intermediate")

    metadata = dict(interview_in.interview_metadata or {})
    metadata.setdefault("job_title", interview_in.job_title or interview_in.job_role or interview_in.title)
    metadata.setdefault("job_description", interview_in.job_description or interview_in.company_context or interview_in.title)
    metadata.setdefault("company_name", interview_in.company_name)
    metadata.setdefault("technologies", interview_in.technologies or [])
    metadata.setdefault("seniority", seniority)
    metadata.setdefault("language", interview_in.language or "pt-BR")

    job_role = interview_in.job_role or metadata.get("job_title") or interview_in.title
    company_context = interview_in.company_context or metadata.get("job_description") or interview_in.title

    interview = Interview(
        user_id=current_user.id,
        title=interview_in.title,
        interview_type=interview_in.interview_type,
        difficulty_level=normalized_difficulty,
        job_role=job_role,
        company_context=company_context,
        seniority=seniority,
        interview_metadata=metadata,
        status=InterviewStatus.PENDING,
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return success_response(
        data=interview,
        message="Entrevista criada com sucesso.",
    )


@router.get(
    "/",
    response_model=ApiSuccessResponse[
        List[InterviewResponse]
    ],
)
async def list_interviews(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Lista todas as entrevistas do usuário autenticado.
    """

    interviews = (
        db.query(Interview)
        .filter(
            Interview.user_id == current_user.id
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return success_response(
        data=interviews,
        message="Entrevistas carregadas com sucesso.",
    )


@router.get(
    "/stats/summary",
    response_model=ApiSuccessResponse[InterviewStats],
)
async def get_interview_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Retorna as estatísticas de entrevistas do usuário.
    """

    interviews = (
        db.query(Interview)
        .filter(
            Interview.user_id == current_user.id
        )
        .all()
    )

    total_interviews = len(interviews)

    completed_interviews = len(
        [
            interview
            for interview in interviews
            if interview.status == InterviewStatus.COMPLETED
        ]
    )

    scores = [
        interview.overall_score
        for interview in interviews
        if interview.overall_score is not None
    ]

    average_score = (
        sum(scores) / len(scores)
        if scores
        else None
    )

    total_time_minutes = 0

    for interview in interviews:
        if (
            interview.started_at
            and interview.completed_at
        ):
            duration = (
                interview.completed_at
                - interview.started_at
            ).total_seconds() / 60

            total_time_minutes += int(duration)

    stats_data = InterviewStats(
        total_interviews=total_interviews,
        completed_interviews=completed_interviews,
        average_score=average_score,
        total_time_spent_minutes=total_time_minutes,
    )

    return success_response(
        data=stats_data,
        message=(
            "Estatísticas de entrevistas "
            "carregadas com sucesso."
        ),
    )


@router.get(
    "/{interview_id}",
    response_model=ApiSuccessResponse[InterviewResponse],
)
async def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Retorna os detalhes de uma entrevista específica.
    """

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista não encontrada.",
        )

    return success_response(
        data=interview,
        message="Entrevista carregada com sucesso.",
    )


@router.put(
    "/{interview_id}",
    response_model=ApiSuccessResponse[InterviewResponse],
)
async def update_interview(
    interview_id: int,
    interview_update: InterviewUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Atualiza os dados de uma entrevista.
    """

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista não encontrada.",
        )

    update_data = interview_update.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(interview, field, value)

    db.commit()
    db.refresh(interview)

    return success_response(
        data=interview,
        message="Entrevista atualizada com sucesso.",
    )


@router.post(
    "/{interview_id}/start",
    response_model=ApiSuccessResponse[InterviewResponse],
)
async def start_interview(
    interview_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Inicia uma sessão de entrevista.
    """

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista não encontrada.",
        )

    if interview.status != InterviewStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A entrevista já foi iniciada "
                "ou concluída."
            ),
        )

    interview.status = InterviewStatus.IN_PROGRESS
    interview.started_at = datetime.utcnow()

    db.commit()
    db.refresh(interview)

    return success_response(
        data=interview,
        message="Entrevista iniciada com sucesso.",
    )


@router.post(
    "/{interview_id}/complete",
    response_model=ApiSuccessResponse[InterviewResponse],
)
async def complete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Conclui uma sessão de entrevista.
    """

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista não encontrada.",
        )

    if interview.status != InterviewStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A entrevista não está em andamento.",
        )

    interview.status = InterviewStatus.COMPLETED
    interview.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(interview)

    return success_response(
        data=interview,
        message="Entrevista concluída com sucesso.",
    )


@router.delete(
    "/{interview_id}",
    response_model=ApiSuccessResponse[None],
    status_code=status.HTTP_200_OK,
)
async def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Exclui uma entrevista.
    """

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrevista não encontrada.",
        )

    db.delete(interview)
    db.commit()

    return success_response(
        data=None,
        message="Entrevista excluída com sucesso.",
    )