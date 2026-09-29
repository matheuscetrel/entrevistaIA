# Mentora.ai

Simulador de entrevistas de emprego com IA, voz no navegador e perguntas adaptadas à vaga.

## Estrutura simples

- `frontend/`: React + Vite, publicado como site estático no Render.
- `backend/`: FastAPI, publicado como Web Service gratuito no Render.
- Supabase: PostgreSQL gratuito usado pelo backend.

Docker, Kubernetes, Redis, MongoDB e microserviços auxiliares não são necessários.

## Rodar localmente

Requisitos: Python 3.11+ e Node.js 20.

No primeiro terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

No segundo terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Acesse `http://localhost:3000`. Localmente, o backend usa SQLite e a OpenAI é opcional.

## Publicar gratuitamente

### 1. Criar o banco no Supabase

1. Crie um projeto gratuito.
2. Em **Connect**, copie a connection string do **Transaction pooler**.
3. Troque `[YOUR-PASSWORD]` pela senha do banco.

### 2. Criar os serviços no Render

1. Envie este repositório ao GitHub.
2. No Render, escolha **New > Blueprint**.
3. Conecte o repositório. O arquivo `render.yaml` criará frontend e backend.
4. Preencha as variáveis solicitadas:

| Serviço | Variável | Valor |
|---|---|---|
| `mentora-api` | `DATABASE_URL` | Connection string do Supabase |
| `mentora-api` | `OPENAI_API_KEY` | Opcional; sem ela há perguntas de fallback |
| `mentora-web` | `VITE_API_URL` | URL do backend + `/api/v1` |

Exemplo de `VITE_API_URL`:

```text
https://mentora-api.onrender.com/api/v1
```

Depois de conhecer as URLs geradas, atualize as variáveis e faça **Manual Deploy > Deploy latest commit** no frontend.

## Comandos de verificação

```powershell
cd frontend
npm run build

cd ..\backend
pytest -q
```

Endpoints úteis:

- Backend: `https://mentora-api.onrender.com`
- Saúde: `https://mentora-api.onrender.com/health`
- Swagger: `https://mentora-api.onrender.com/docs`
# entrevistaIA
