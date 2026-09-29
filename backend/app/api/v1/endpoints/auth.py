"""
Authentication API endpoints.
"""

import re
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_active_user,
    get_password_hash,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.api_response import (
    ApiSuccessResponse,
    success_response,
)
from app.schemas.user import (
    RefreshTokenRequest,
    ResetPasswordRequest,
    SecurityQuestionRequest,
    SecurityQuestionResponse,
    Token,
    UserCreate,
    UserResponse,
)


router = APIRouter()


def create_token_pair(user_id: int) -> dict:
    """
    Cria um novo par de Access Token e Refresh Token.
    """

    subject = {
        "sub": str(user_id),
    }

    access_token = create_access_token(
        data=subject,
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )

    refresh_token = create_refresh_token(
        data=subject,
        expires_delta=timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        ),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post(
    "/register",
    response_model=ApiSuccessResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Cadastra um novo usuário.
    """

    existing_user = (
        db.query(User)
        .filter(
            (User.email == user_in.email)
            | (User.username == user_in.username)
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists",
        )

    cpf_digits = re.sub(
        r"\D",
        "",
        user_in.cpf,
    )

    if len(cpf_digits) != 11:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF inválido.",
        )

    security_answer = (
        user_in.security_answer
        .strip()
        .lower()
    )

    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(
            user_in.password
        ),
        cpf_hash=get_password_hash(
            cpf_digits
        ),
        security_question=user_in.security_question,
        security_answer_hash=get_password_hash(
            security_answer
        ),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível cadastrar o usuário.",
        )

    return success_response(
        data=user,
        message="Usuário cadastrado com sucesso.",
    )


@router.post(
    "/login",
    response_model=Token,
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Autentica o usuário e devolve Access Token e Refresh Token.

    O campo username pode receber:
    - nome de usuário;
    - e-mail.

    Esta resposta permanece sem envelope para manter
    compatibilidade com OAuth2 e Swagger.
    """

    user = (
        db.query(User)
        .filter(
            (User.username == form_data.username)
            | (User.email == form_data.username)
        )
        .first()
    )

    if (
        user is None
        or not verify_password(
            form_data.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return create_token_pair(user.id)


@router.get(
    "/me",
    response_model=ApiSuccessResponse[UserResponse],
)
async def get_current_user_info(
    current_user: User = Depends(
        get_current_active_user
    ),
):
    """
    Retorna as informações do usuário autenticado.

    Esta rota aceita somente Access Token.
    """

    return success_response(
        data=current_user,
        message="Usuário autenticado carregado com sucesso.",
    )


@router.post(
    "/refresh",
    response_model=Token,
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Valida o Refresh Token e gera um novo par de tokens.

    O Refresh Token recebido precisa:
    - ser um JWT válido;
    - não estar expirado;
    - possuir type igual a refresh;
    - pertencer a um usuário existente e ativo.

    Esta resposta permanece sem envelope para preservar
    o fluxo atual de renovação dos tokens.
    """

    token_payload = decode_token(
        payload.refresh_token,
        expected_type="refresh",
    )

    subject = token_payload.get("sub")

    try:
        user_id = int(subject)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # Rotação: gera um novo Access Token e um novo Refresh Token
    return create_token_pair(user.id)


@router.post(
    "/security-question",
    response_model=ApiSuccessResponse[
        SecurityQuestionResponse
    ],
)
async def get_security_question(
    payload: SecurityQuestionRequest,
    db: Session = Depends(get_db),
):
    """
    Retorna a pergunta de segurança cadastrada para o e-mail.
    """

    user = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if user is None or not user.security_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Nenhuma pergunta secreta cadastrada "
                "para este e-mail."
            ),
        )

    return success_response(
        data={
            "security_question": user.security_question,
        },
        message="Pergunta de segurança encontrada.",
    )


@router.post(
    "/reset-password",
    response_model=ApiSuccessResponse[dict[str, str]],
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Confere CPF e resposta de segurança antes de redefinir a senha.
    """

    user = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if (
        user is None
        or not user.security_answer_hash
        or not user.cpf_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Usuário não encontrado ou sem dados "
                "de recuperação cadastrados."
            ),
        )

    cpf_digits = re.sub(
        r"\D",
        "",
        payload.cpf,
    )

    if not verify_password(
        cpf_digits,
        user.cpf_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF incorreto.",
        )

    security_answer = (
        payload.security_answer
        .strip()
        .lower()
    )

    if not verify_password(
        security_answer,
        user.security_answer_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resposta da pergunta secreta incorreta.",
        )

    user.hashed_password = get_password_hash(
        payload.new_password
    )

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível redefinir a senha.",
        )

    return success_response(
        data={
            "result": "password_updated",
        },
        message="Senha redefinida com sucesso!",
    )