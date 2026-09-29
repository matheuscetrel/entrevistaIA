"""
Aplicação principal FastAPI - Simulador de Entrevista com IA
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exception_handlers import (
    register_exception_handlers,
)
from app.db.base import Base
from app.db.session import engine

# Importa os models para registrá-los no SQLAlchemy
from app.models import Answer, Interview, Question, User


# Configuração de logs
logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | %(levelname)s | "
        "%(name)s | %(message)s"
    ),
)

logger = logging.getLogger(__name__)


# Criação da aplicação FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API para Simulador de Entrevista com IA",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)


# Registra os handlers globais de exceção
register_exception_handlers(app)


# Endereços autorizados a acessar o backend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://192.168.18.103:3000",
    "http://192.168.137.1:3000",
    "http://192.168.1.112:3000",
]


# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Rotas da API
app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
)

@app.on_event("startup")
async def startup_event():
    """Executa quando a aplicação é iniciada."""

    logger.info("Starting up Entrevista.IA Backend...")

    # Cria as tabelas que ainda não existem
    Base.metadata.create_all(bind=engine)

    logger.info("Database tables created successfully")

    # Cria o administrador padrão caso ele não exista
@app.on_event("shutdown")
async def shutdown_event():
    """Executa quando a aplicação é encerrada."""

    logger.info("Shutting down Entrevista.IA Backend...")


@app.get("/")
async def root():
    """Rota inicial da API."""

    return {
        "message": "Entrevista.IA API",
        "version": settings.VERSION,
        "docs": "/docs",
        "status": "online",
    }


@app.get("/health")
async def health_check():
    """Verifica se o backend está funcionando."""

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "entrevista-ia-backend",
            "version": settings.VERSION,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
