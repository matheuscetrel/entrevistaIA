"""
Question and Answer API endpoints.
"""

from datetime import datetime
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.interview import Interview
from app.models.question import Answer, Question
from app.models.user import User
from app.schemas.api_response import (
    ApiSuccessResponse,
    success_response,
)
from app.schemas.question import (
    AnswerCreate,
    AnswerResponse,
    AudioAnswerCreate,
    FeedbackResponse,
    GenerateQuestionRequest,
    QuestionResponse,
)


router = APIRouter()


# Prompt utilizado pela entrevistadora Sofia
SOFIA_SYSTEM_PROMPT = """
Você é Sofia, entrevistadora sênior de RH da Mentora.ai.
Conduza uma entrevista profissional em português brasileiro
de forma natural e acolhedora.

REGRAS ABSOLUTAS:
- Faça APENAS UMA pergunta por vez
- Seja concisa: máximo 2 frases
- Baseie a próxima pergunta no que o candidato acabou de
  responder quando possível
- Aprofunde temas relevantes que o candidato mencionou
- Varie entre: apresentação, experiência, comportamento,
  situações e motivação
- NÃO inclua prefixos como "Sofia:", "Pergunta N:" ou numeração
- NÃO repita perguntas já feitas
- Tom: profissional, humano e encorajador, como uma
  entrevistadora real de empresa de tecnologia
""".strip()


async def _generate_ai_question(
    interview: Interview,
    previous_qa: list[dict[str, str]],
    question_number: int,
    language: str,
) -> dict:
    """
    Gera a próxima pergunta usando o histórico completo da entrevista.
    """

    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")

    try:
        from openai import AsyncOpenAI

    except ImportError as exception:
        raise ValueError(
            "openai package not installed"
        ) from exception

    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    messages = [
        {
            "role": "system",
            "content": SOFIA_SYSTEM_PROMPT,
        }
    ]

    metadata = interview.interview_metadata or {}
    job_context = (
        metadata.get("job_title")
        or metadata.get("job_role")
        or interview.job_role
        or "uma posição em aberto"
    )
    company_name = (
        metadata.get("company_name")
        or ""
    )
    company_context = (
        metadata.get("job_description")
        or metadata.get("company_context")
        or interview.company_context
        or ""
    )
    technologies = metadata.get("technologies") or []
    seniority = (metadata.get("seniority") or interview.seniority or "pleno").lower()
    seniority_guidance = {
        "estagio": "Use perguntas focadas em fundamentos, aprendizagem e curiosidade. Evite exigências avançadas e priorize clareza e base conceitual.",
        "junior": "Use perguntas de nível inicial e intermediário, com foco em base técnica, aprendizado e experiência prática inicial.",
        "pleno": "Use perguntas de nível intermediário, com foco em autonomia, responsabilidade e tomada de decisão em projetos reais.",
        "senior": "Use perguntas mais profundas, com foco em arquitetura, trade-offs, liderança, escalabilidade e impacto técnico.",
        "especialista": "Use perguntas de alta complexidade, com foco em excelência técnica, estratégia, arquitetura, liderança e influência no negócio.",
    }

    context_text = (
        "Contexto da entrevista:\n"
        f"- Cargo: {job_context}\n"
        f"- Idioma: {language}"
    )

    if company_name:
        context_text += f"\n- Empresa: {company_name}"

    if seniority:
        context_text += f"\n- Senioridade: {seniority}"
        context_text += f"\n- Diretriz de profundidade: {seniority_guidance.get(seniority, seniority_guidance['pleno'])}"

    if technologies:
        context_text += f"\n- Stack: {', '.join(str(item) for item in technologies[:10])}"

    if company_context:
        context_text += (
            "\n- Descrição da vaga: "
            f"{company_context[:500]}"
        )

    context_text += (
        "\n- Total de perguntas: 5"
        f"\n- Pergunta atual: {question_number}/5"
    )

    messages.append(
        {
            "role": "user",
            "content": context_text,
        }
    )

    messages.append(
        {
            "role": "assistant",
            "content": (
                "Entendido. Vou conduzir a entrevista "
                "com foco nessa vaga."
            ),
        }
    )

    # Inclui todo o histórico de perguntas e respostas
    for question_answer in previous_qa:
        messages.append(
            {
                "role": "assistant",
                "content": question_answer["question"],
            }
        )

        messages.append(
            {
                "role": "user",
                "content": question_answer["answer"],
            }
        )

    if question_number == 1:
        instruction = (
            "Faça a pergunta de abertura da entrevista. "
            "Seja receptiva e acolhedora."
        )

    elif question_number >= 5:
        instruction = (
            "Faça a pergunta final da entrevista. "
            "Pode ser sobre expectativas ou algo que "
            "o candidato queira acrescentar."
        )

    else:
        instruction = (
            f"Faça a pergunta {question_number} da entrevista, "
            "levando em conta as respostas anteriores."
        )

    messages.append(
        {
            "role": "user",
            "content": instruction,
        }
    )

    model = (
        settings.OPENAI_MODEL
        if settings.OPENAI_MODEL
        else "gpt-4o-mini"
    )

    if model == "gpt-4":
        model = "gpt-4o-mini"

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.85,
        max_tokens=180,
    )

    question_content = (
        response.choices[0].message.content
    )

    if not question_content:
        raise ValueError(
            "OpenAI returned an empty question"
        )

    question_text = question_content.strip()

    categories = {
        1: "introduction",
        2: "experience",
        3: "behavioral",
        4: "situational",
        5: "closing",
    }

    category = categories.get(
        question_number,
        "behavioral",
    )

    return {
        "question_text": question_text,
        "question_type": "behavioral",
        "category": category,
        "difficulty": (
            interview.difficulty_level
            or "medium"
        ),
    }


def get_fallback_question(
    language: str,
    difficulty: str,
    question_number: int = 1,
) -> dict:
    """
    Retorna uma pergunta local quando a IA não está disponível.
    """

    fallback_sets = {
        "pt-BR": [
            (
                "Olá! Fico feliz em te receber aqui. "
                "Para começarmos, me conte um pouco sobre "
                "você e sua trajetória profissional."
            ),
            (
                "Que experiências anteriores você acredita "
                "que mais te preparam para essa vaga?"
            ),
            (
                "Descreva uma situação em que você enfrentou "
                "um desafio difícil no trabalho. "
                "Como você resolveu?"
            ),
            (
                "Como você se organiza para lidar com "
                "múltiplas tarefas e prazos ao mesmo tempo?"
            ),
            (
                "Para finalizar, o que te motiva nessa área "
                "e quais são suas expectativas para os "
                "próximos anos?"
            ),
        ],
        "en-US": [
            (
                "Tell me about yourself and your "
                "professional background."
            ),
            (
                "What experience do you have that's most "
                "relevant to this position?"
            ),
            (
                "Describe a challenging situation you faced "
                "at work and how you resolved it."
            ),
            (
                "How do you manage multiple tasks and "
                "competing deadlines?"
            ),
            (
                "Finally, what motivates you in this field "
                "and what are your career goals?"
            ),
        ],
    }

    questions = fallback_sets.get(
        language,
        fallback_sets["en-US"],
    )

    index = min(
        question_number - 1,
        len(questions) - 1,
    )

    categories = [
        "introduction",
        "experience",
        "behavioral",
        "situational",
        "closing",
    ]

    return {
        "question_text": questions[index],
        "question_type": "behavioral",
        "category": categories[index],
        "difficulty": difficulty,
    }


@router.get(
    "/interviews/{interview_id}/questions",
    response_model=ApiSuccessResponse[
        List[QuestionResponse]
    ],
)
async def get_interview_questions(
    interview_id: int,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retorna todas as perguntas de uma entrevista.
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

    questions = (
        db.query(Question)
        .filter(
            Question.interview_id == interview_id
        )
        .order_by(Question.order_number)
        .all()
    )

    return success_response(
        data=questions,
        message="Perguntas carregadas com sucesso.",
    )


@router.post(
    "/interviews/{interview_id}/generate-question",
    response_model=ApiSuccessResponse[QuestionResponse],
)
async def generate_next_question(
    interview_id: int,
    request_data: GenerateQuestionRequest,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: Session = Depends(get_db),
):
    """
    Gera a próxima pergunta usando o histórico da entrevista.
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

    previous_questions = (
        db.query(Question)
        .filter(
            Question.interview_id == interview_id
        )
        .order_by(Question.order_number)
        .all()
    )

    question_number = len(previous_questions) + 1

    previous_qa: list[dict[str, str]] = []

    for previous_question in previous_questions:
        if previous_question.answer:
            previous_qa.append(
                {
                    "question": (
                        previous_question.question_text
                    ),
                    "answer": (
                        previous_question.answer.answer_text
                    ),
                }
            )

    language = (
        request_data.language
        or "pt-BR"
    )

    try:
        question_data = await _generate_ai_question(
            interview=interview,
            previous_qa=previous_qa,
            question_number=question_number,
            language=language,
        )

    except Exception:
        question_data = get_fallback_question(
            language=language,
            difficulty=(
                interview.difficulty_level
                or "medium"
            ),
            question_number=question_number,
        )

    question = Question(
        interview_id=interview_id,
        question_text=question_data["question_text"],
        question_type=question_data["question_type"],
        category=question_data.get("category"),
        difficulty=question_data.get(
            "difficulty",
            "medium",
        ),
        order_number=question_number,
        ai_generated=True,
        asked_at=datetime.utcnow(),
    )

    db.add(question)

    interview.total_questions = question_number

    db.commit()
    db.refresh(question)

    return success_response(
        data=question,
        message="Pergunta gerada com sucesso.",
    )


@router.post(
    "/questions/{question_id}/answer",
    response_model=ApiSuccessResponse[AnswerResponse],
)
async def submit_answer(
    question_id: int,
    answer_in: AnswerCreate,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: Session = Depends(get_db),
):
    """
    Registra a resposta de uma pergunta.
    """

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada.",
        )

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == question.interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado.",
        )

    existing_answer = (
        db.query(Answer)
        .filter(
            Answer.question_id == question_id
        )
        .first()
    )

    if existing_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Já existe uma resposta enviada "
                "para esta pergunta."
            ),
        )

    answer = Answer(
        question_id=question_id,
        answer_text=answer_in.answer_text,
        answer_method=answer_in.answer_method,
        time_taken_seconds=(
            answer_in.time_taken_seconds
        ),
    )

    db.add(answer)

    interview.answered_questions += 1

    db.commit()
    db.refresh(answer)

    return success_response(
        data=answer,
        message="Resposta enviada com sucesso.",
    )


@router.post(
    "/questions/{question_id}/audio",
    response_model=ApiSuccessResponse[AnswerResponse],
)
async def submit_audio_answer(
    question_id: int,
    audio_answer: AudioAnswerCreate,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: Session = Depends(get_db),
):
    """
    Registra uma resposta em áudio.
    """

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada.",
        )

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == question.interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado.",
        )

    existing_answer = (
        db.query(Answer)
        .filter(
            Answer.question_id == question_id
        )
        .first()
    )

    if existing_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Já existe uma resposta enviada "
                "para esta pergunta."
            ),
        )

    # Mantém o comportamento atual:
    # o conteúdo Base64 é armazenado no answer_text.
    answer = Answer(
        question_id=question_id,
        answer_text=audio_answer.audio_data,
        answer_method="voice",
        time_taken_seconds=(
            audio_answer.time_taken_seconds
        ),
    )

    db.add(answer)

    interview.answered_questions += 1

    db.commit()
    db.refresh(answer)

    return success_response(
        data=answer,
        message="Resposta em áudio enviada com sucesso.",
    )


@router.get(
    "/answers/{answer_id}/feedback",
    response_model=ApiSuccessResponse[FeedbackResponse],
)
async def get_answer_feedback(
    answer_id: int,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retorna o feedback gerado para uma resposta.
    """

    answer = (
        db.query(Answer)
        .filter(
            Answer.id == answer_id
        )
        .first()
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resposta não encontrada.",
        )

    question = (
        db.query(Question)
        .filter(
            Question.id == answer.question_id
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta relacionada não encontrada.",
        )

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == question.interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado.",
        )

    if answer.analyzed and answer.feedback:
        cached_feedback = FeedbackResponse(
            score=answer.score or 0,
            strengths=answer.feedback.get(
                "strengths",
                [],
            ),
            weaknesses=answer.feedback.get(
                "weaknesses",
                [],
            ),
            suggestions=answer.feedback.get(
                "suggestions",
                [],
            ),
            overall_comment=answer.feedback.get(
                "overall_comment",
                "",
            ),
        )

        return success_response(
            data=cached_feedback,
            message="Feedback carregado com sucesso.",
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                (
                    f"{settings.AI_SERVICE_URL}"
                    "/analyze-answer"
                ),
                json={
                    "question": question.question_text,
                    "answer": answer.answer_text,
                    "question_type": (
                        question.question_type
                    ),
                },
                timeout=30.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=(
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    ),
                    detail=(
                        "Não foi possível analisar "
                        "a resposta."
                    ),
                )

            feedback_data = response.json()

            answer.analyzed = True
            answer.score = feedback_data.get(
                "score",
                50,
            )

            answer.feedback = {
                "strengths": feedback_data.get(
                    "strengths",
                    [],
                ),
                "weaknesses": feedback_data.get(
                    "weaknesses",
                    [],
                ),
                "suggestions": feedback_data.get(
                    "suggestions",
                    [],
                ),
                "overall_comment": feedback_data.get(
                    "overall_comment",
                    "",
                ),
            }

            answer.sentiment_score = feedback_data.get(
                "sentiment_score"
            )

            answer.keywords = feedback_data.get(
                "keywords",
                [],
            )

            answer.analyzed_at = datetime.utcnow()

            db.commit()
            db.refresh(answer)

            generated_feedback = FeedbackResponse(
                score=answer.score,
                strengths=answer.feedback["strengths"],
                weaknesses=answer.feedback["weaknesses"],
                suggestions=answer.feedback["suggestions"],
                overall_comment=(
                    answer.feedback["overall_comment"]
                ),
            )

            return success_response(
                data=generated_feedback,
                message="Feedback gerado com sucesso.",
            )

    except httpx.HTTPError as exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "O serviço de inteligência artificial "
                "está temporariamente indisponível."
            ),
        ) from exception