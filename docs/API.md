# Documentacao da API - Mentora.ai

## Base URL

```text
http://localhost:8000/api/v1
```

## Autenticacao

As rotas privadas exigem:

```text
Authorization: Bearer {token}
```

## Health e raiz

- `GET /` retorna informacoes basicas da API
- `GET /health` retorna status de saude

## Endpoints de autenticacao

### POST /auth/register
Cria novo usuario.

Request JSON:
```json
{
  "email": "usuario@example.com",
  "username": "usuario",
  "full_name": "Nome",
  "password": "senha12345"
}
```

### POST /auth/login
Login OAuth2 password form.

Content-Type: `application/x-www-form-urlencoded`

Campos:
- `username` (aceita username ou email)
- `password`

Resposta:
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### GET /auth/me
Retorna usuario autenticado.

### POST /auth/refresh
Emite novo access token para usuario autenticado.

## Endpoints de entrevistas

### POST /interviews/
Cria entrevista com status inicial `pending`.

Campos aceitos:
- `title` (obrigatorio)
- `interview_type`: `technical` | `behavioral` | `mixed` | `custom`
- `difficulty_level`: `beginner` | `intermediate` | `advanced`
- `job_role` (opcional)
- `company_context` (opcional)

### GET /interviews/
Lista entrevistas do usuario.

Query params:
- `skip` (default 0)
- `limit` (default 100)

### GET /interviews/{interview_id}
Detalhes de uma entrevista.

### PUT /interviews/{interview_id}
Atualiza campos permitidos da entrevista.

### POST /interviews/{interview_id}/start
Muda status para `in_progress` e define `started_at`.

### POST /interviews/{interview_id}/complete
Muda status para `completed` e define `completed_at`.

### DELETE /interviews/{interview_id}
Remove entrevista.

### GET /interviews/stats/summary
Retorna resumo:
- `total_interviews`
- `completed_interviews`
- `average_score`
- `total_time_spent_minutes`

## Endpoints de perguntas e respostas

### GET /questions/interviews/{interview_id}/questions
Lista perguntas da entrevista em ordem.

### POST /questions/interviews/{interview_id}/generate-question
Gera proxima pergunta considerando historico Q&A.

Request JSON:
```json
{
  "language": "pt-BR"
}
```

Observacoes:
- Tenta OpenAI primeiro.
- Se falhar ou sem chave, usa fallback estatico.

### POST /questions/questions/{question_id}/answer
Envia resposta textual da pergunta.

Request JSON:
```json
{
  "question_id": 123,
  "answer_text": "Minha resposta",
  "answer_method": "text",
  "time_taken_seconds": 95
}
```

Nota:
- A rota ja possui `question_id` na URL e o schema atual tambem exige no body.

### POST /questions/questions/{question_id}/audio
Envia resposta em audio (base64).

Request JSON:
```json
{
  "question_id": 123,
  "audio_data": "...base64...",
  "audio_format": "webm",
  "time_taken_seconds": 95
}
```

### GET /questions/answers/{answer_id}/feedback
Retorna feedback analitico da resposta.

Comportamento:
- Se ja analisada, retorna cache salvo no banco.
- Se nao analisada, chama `AI_SERVICE_URL/analyze-answer`.
- Se o ai-services estiver indisponivel, pode retornar erro 503.

## Codigos de status comuns

- `200 OK`
- `201 Created`
- `204 No Content`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `503 Service Unavailable` (especialmente no feedback com ai-services offline)

## O que nao existe hoje na API

- Recuperacao de senha
- Revogacao de token de logout
- Rate limit declarado no backend
- Filtros avancados de entrevistas por query
