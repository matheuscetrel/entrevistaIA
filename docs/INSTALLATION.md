# Guia de Instalacao - Mentora.ai

Este guia reflete o estado atual do projeto.

## Modos de execucao

- Docker (stack completa): frontend, backend, ai-services, voice-services, analytics, postgres, mongodb e redis.
- Local sem Docker (modo rapido): frontend + backend apenas, com SQLite.

## Requisitos

### Docker
- Docker Desktop ativo
- Docker Compose

### Local sem Docker
- Python 3.12+
- Node.js 18+
- npm

## Opcao 1 - Rodar com Docker (stack completa)

### 1. Configure ambiente
```powershell
Copy-Item .env.example .env
```

### 2. Suba os servicos
```powershell
.\verificar-docker.bat
.\iniciar.bat
```

Ou direto:
```powershell
docker-compose up -d
```

### 3. Enderecos
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- AI Services: http://localhost:8001
- Analytics: http://localhost:8002
- Voice Services: http://localhost:8003

### 4. Operacao basica
```powershell
docker-compose ps
docker-compose logs -f
docker-compose down
```

## Opcao 2 - Rodar local sem Docker (modo rapido)

Esse modo usa SQLite e sobe apenas backend + frontend.

### 1. Verifique requisitos
```powershell
.\verificar-requisitos.bat
```

### 2. Inicie tudo
```powershell
.\rodar-local.bat
```

### 3. Enderecos
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs

## Observacoes importantes

- O backend gera perguntas com OpenAI diretamente quando OPENAI_API_KEY esta configurada.
- Sem OPENAI_API_KEY, o backend usa perguntas fallback.
- O endpoint de feedback por resposta depende do ai-services (porta 8001).
- No modo local sem Docker, o ai-services nao sobe automaticamente.

## Variaveis recomendadas

No arquivo .env (raiz):

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
SECRET_KEY=troque-em-producao
USE_SQLITE=true
```

## Troubleshooting rapido

### Python nao encontrado
- Instale Python 3.12+
- Marque Add Python to PATH

### npm ou node nao encontrado
- Reinstale Node.js LTS

### Porta ocupada
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :8000
```

### API de feedback retorna erro 503
- Suba o ai-services com Docker
- Ou use a aplicacao sem feedback analitico por resposta
