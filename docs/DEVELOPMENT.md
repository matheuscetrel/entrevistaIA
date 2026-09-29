# Guia de Desenvolvimento - Mentora.ai

Este documento descreve a estrutura e o fluxo reais do projeto atualmente.

## Stack atual

- Frontend: React + TanStack Router + Vite + Tailwind
- Backend: FastAPI + SQLAlchemy + JWT
- IA:
	- Geracao de perguntas: feita no backend
	- Analise de resposta: feita no ai-services
- Banco:
	- Local sem Docker: SQLite
	- Com Docker: PostgreSQL + MongoDB + Redis

## Estrutura relevante

```text
entrevista.ia/
	backend/
		app/
			api/v1/endpoints/
			core/
			db/
			models/
			schemas/
	frontend/
		src/
			routes/
			components/
			hooks/
			lib/
	ai-services/
	voice-services/
	analytics/
	infrastructure/kubernetes/
	docs/
```

## Fluxo funcional principal

1. Usuario autentica
2. Frontend cria entrevista
3. Frontend inicia entrevista
4. Backend gera perguntas (OpenAI ou fallback)
5. Usuario responde (texto ou ditado via STT no browser)
6. Frontend finaliza entrevista
7. Tela de feedback mostra dados agregados disponiveis

## Rodando para desenvolver

### Opcao A: rapido sem Docker
```powershell
.\verificar-requisitos.bat
.\rodar-local.bat
```

### Opcao B: stack completa com Docker
```powershell
.\verificar-docker.bat
.\iniciar.bat
```

## Rodando manualmente por servico

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
$env:USE_SQLITE = "true"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

### AI Services (opcional para feedback por resposta)
```powershell
cd ai-services
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Pontos tecnicos importantes

- O frontend usa `frontend/src/lib/api.ts` para todas as chamadas principais.
- O endpoint de feedback por resposta chama `AI_SERVICE_URL` no backend.
- Sem ai-services ativo, o feedback por resposta pode retornar indisponivel.
- O frontend atualmente usa tema claro/escuro com persistencia local.

## Estado atual por modulo

- Autenticacao: funcional
- Entrevistas (CRUD + start/complete): funcional
- Geracao de perguntas com contexto: funcional
- Avaliacao consolidada final da entrevista: parcial
- SaaS (planos, creditos, pagamentos): nao implementado

## Qualidade e verificacoes

### Lint frontend
```powershell
cd frontend
npm run lint
```

### Backend basico
```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Observacoes

- Este projeto ainda nao possui fluxo completo de recuperacao de senha.
- Campos de score por entrevista existem no modelo, mas a consolidacao automatica ainda e parcial.
