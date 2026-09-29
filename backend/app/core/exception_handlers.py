"""
Tratamento global e padronizado de exceções da API.
"""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import (
    HTTPException as StarletteHTTPException,
)


logger = logging.getLogger(__name__)


DEFAULT_MESSAGES = {
    400: "Requisição inválida.",
    401: "Não foi possível validar a autenticação.",
    403: "Você não possui permissão para realizar esta operação.",
    404: "Recurso não encontrado.",
    405: "Método não permitido.",
    409: "Conflito ao processar a operação.",
    422: "Dados enviados são inválidos.",
    500: "Erro interno do servidor.",
}


def build_error_response(
    *,
    message: str,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Monta a estrutura padrão de erro.
    """

    return {
        "success": False,
        "data": None,
        "message": message,
        "errors": errors or [],
    }


def get_default_message(status_code: int) -> str:
    """
    Retorna uma mensagem segura para o status informado.
    """

    if status_code in DEFAULT_MESSAGES:
        return DEFAULT_MESSAGES[status_code]

    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Não foi possível processar a solicitação."


def get_http_exception_message(
    detail: Any,
    status_code: int,
) -> str:
    """
    Extrai uma mensagem segura de uma HTTPException.
    """

    if isinstance(detail, str) and detail.strip():
        return detail

    if isinstance(detail, dict):
        message = detail.get("message")

        if isinstance(message, str) and message.strip():
            return message

    return get_default_message(status_code)


def format_validation_errors(
    exception: RequestValidationError,
) -> list[dict[str, str]]:
    """
    Formata erros de validação sem devolver valores recebidos.

    Campos como senha, CPF, token e conteúdo enviado não são
    incluídos na resposta.
    """

    formatted_errors: list[dict[str, str]] = []

    for error in exception.errors():
        location = error.get("loc", ())

        field_parts = [
            str(part)
            for part in location
            if part not in {
                "body",
                "query",
                "path",
                "header",
            }
        ]

        field = ".".join(field_parts) or "request"

        formatted_errors.append(
            {
                "field": field,
                "message": str(
                    error.get(
                        "msg",
                        "Valor inválido.",
                    )
                ),
                "type": str(
                    error.get(
                        "type",
                        "validation_error",
                    )
                ),
            }
        )

    return formatted_errors


async def http_exception_handler(
    request: Request,
    exception: StarletteHTTPException,
) -> JSONResponse:
    """
    Padroniza HTTPException mantendo status e headers.
    """

    message = get_http_exception_message(
        exception.detail,
        exception.status_code,
    )

    return JSONResponse(
        status_code=exception.status_code,
        headers=exception.headers,
        content=build_error_response(
            message=message,
        ),
    )


async def validation_exception_handler(
    request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    """
    Padroniza erros de validação do FastAPI com status 400.
    """

    errors = format_validation_errors(exception)

    logger.warning(
        "Validation error: method=%s path=%s fields=%s",
        request.method,
        request.url.path,
        [error["field"] for error in errors],
    )

    return JSONResponse(
        status_code=400,
        content=build_error_response(
            message="Dados enviados são inválidos.",
            errors=errors,
        ),
    )


async def database_exception_handler(
    request: Request,
    exception: SQLAlchemyError,
) -> JSONResponse:
    """
    Registra erros do banco internamente sem expor detalhes.
    """

    logger.exception(
        "Database error: method=%s path=%s",
        request.method,
        request.url.path,
        exc_info=exception,
    )

    return JSONResponse(
        status_code=500,
        content=build_error_response(
            message="Erro interno do servidor.",
        ),
    )


async def unexpected_exception_handler(
    request: Request,
    exception: Exception,
) -> JSONResponse:
    """
    Registra exceções inesperadas sem expor stack trace.
    """

    logger.exception(
        "Unexpected error: method=%s path=%s",
        request.method,
        request.url.path,
        exc_info=exception,
    )

    return JSONResponse(
        status_code=500,
        content=build_error_response(
            message="Erro interno do servidor.",
        ),
    )


def register_exception_handlers(
    app: FastAPI,
) -> None:
    """
    Registra todos os handlers globais na aplicação.
    """

    app.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,
    )

    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )

    app.add_exception_handler(
        SQLAlchemyError,
        database_exception_handler,
    )

    app.add_exception_handler(
        Exception,
        unexpected_exception_handler,
    )