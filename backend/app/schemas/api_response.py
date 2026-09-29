"""
Schemas e helpers para respostas padronizadas da API.
"""

from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")


class ApiSuccessResponse(BaseModel, Generic[T]):
    """
    Estrutura padrão para respostas de sucesso.
    """

    success: Literal[True] = True
    data: T
    message: str


class ApiErrorDetail(BaseModel):
    """
    Detalhe seguro de um erro de validação.
    """

    field: str
    message: str
    type: str


class ApiErrorResponse(BaseModel):
    """
    Estrutura padrão para respostas de erro.
    """

    success: Literal[False] = False
    data: None = None
    message: str
    errors: list[ApiErrorDetail] = Field(
        default_factory=list
    )


def success_response(
    *,
    data: Any = None,
    message: str = "Operação realizada com sucesso.",
) -> dict[str, Any]:
    """
    Monta uma resposta de sucesso padronizada.

    O response_model do endpoint continua responsável
    por validar e serializar o conteúdo de data.
    """

    return {
        "success": True,
        "data": data,
        "message": message,
    }