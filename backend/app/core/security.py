"""
Utilitários de segurança para autenticação e autorização.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User


# Configuração para criptografia das senhas
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# Endpoint usado pelo Swagger para autenticação
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def create_credentials_exception() -> HTTPException:
    """Retorna a resposta padrão para credenciais inválidas."""

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Verifica uma senha em texto contra o hash armazenado."""

    try:
        return pwd_context.verify(
            plain_password,
            hashed_password,
        )
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    """Gera o hash seguro de uma senha."""

    return pwd_context.hash(password)


def create_token(
    data: dict,
    token_type: str,
    expires_delta: timedelta,
) -> str:
    """
    Cria um JWT assinado.

    O token contém:
    - sub: identificação do usuário;
    - type: access ou refresh;
    - exp: data de expiração;
    - iat: data de criação;
    - jti: identificador único.
    """

    if token_type not in {"access", "refresh"}:
        raise ValueError("Invalid token type")

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    to_encode = data.copy()

    # O padrão JWT recomenda que o subject seja uma string
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])

    to_encode.update(
        {
            "type": token_type,
            "iat": now,
            "exp": expire,
            "jti": str(uuid4()),
        }
    )

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Cria um Access Token."""

    expiration = expires_delta or timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return create_token(
        data=data,
        token_type="access",
        expires_delta=expiration,
    )


def create_refresh_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Cria um Refresh Token."""

    expiration = expires_delta or timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    return create_token(
        data=data,
        token_type="refresh",
        expires_delta=expiration,
    )


def decode_token(
    token: str,
    expected_type: Optional[str] = None,
) -> dict:
    """
    Decodifica e valida um JWT.

    Quando expected_type for informado, impede que:
    - Refresh Token seja usado como Access Token;
    - Access Token seja usado como Refresh Token.
    """

    credentials_exception = create_credentials_exception()

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        subject = payload.get("sub")
        token_type = payload.get("type")

        if subject is None:
            raise credentials_exception

        if token_type not in {"access", "refresh"}:
            raise credentials_exception

        if (
            expected_type is not None
            and token_type != expected_type
        ):
            raise credentials_exception

        return payload

    except HTTPException:
        raise

    except JWTError:
        raise credentials_exception


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Busca o usuário autenticado usando o Access Token.

    Esta função aceita somente tokens do tipo access.
    """

    credentials_exception = create_credentials_exception()

    payload = decode_token(
        token,
        expected_type="access",
    )

    subject = payload.get("sub")

    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise credentials_exception

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Verifica se o usuário autenticado está ativo."""

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return current_user