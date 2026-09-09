# Projeto Seringa — Fase 1: Inteligência Artificial

Esta fase constrói somente o cérebro de software. O projeto físico ainda não é implementado.

## Princípio

A IA interpreta, raciocina e recomenda. Ela não controla diretamente nenhum dispositivo físico.

`entrada -> contexto -> memória -> modelo -> resposta -> auditoria`

Qualquer ação física futura deverá passar por uma camada independente de regras, permissões e segurança.

## Componentes

- `AICore`: orquestra a inteligência.
- `ModelProvider`: contrato para trocar modelos sem reescrever o núcleo.
- `OpenAIProvider`: primeiro adaptador real, usando `OPENAI_API_KEY` do ambiente.
- `MemoryStore`: memória de sessão.
- `SafetyPolicy`: fronteira entre raciocínio e atuação física.
- `AuditLog`: rastreabilidade das solicitações e respostas.
- `AIRequest/AIResponse`: contrato de entrada e saída.

## Execução

Configure `OPENAI_API_KEY` no ambiente e instale o projeto com `pip install -e .`.

Teste: `pytest -q`

CLI: `syringe-ai "explique o objetivo do sistema"`

Nenhuma chave, token ou credencial deve ser gravada no repositório.

## Fase 1.1 — IA gratuita e substituível

A arquitetura agora usa Strategy/Adapter com um contrato OpenAI-compatible. O caminho padrão é:
`OpenRouter free -> Gemini free (se configurado) -> Ollama local -> bloqueio seguro`.

Visão local padrão: `qwen3-vl:4b`. Texto local padrão: `qwen3:4b`.

O mesmo contrato permite trocar para OpenAI premium apenas por ambiente:
`AI_PROVIDER=openai` + `PREMIUM_OPENAI_API_KEY` + `PREMIUM_OPENAI_MODEL`.

### Backend

`cd backend`

`pip install -r requirements.txt`

`uvicorn app.main:app --reload --port 8000`

Health: `GET /health`

Vision: `POST /api/v1/verify-injection`

Body map: `GET /api/v1/body-map/next-site?user_id=...`

Assistant: `POST /api/v1/chat` com `{ "message": "..." }`

### Ollama

`ollama pull qwen3-vl:4b`

`ollama pull qwen3:4b`

### Docker

Copie `.env.example` para `.env` e execute `docker compose up --build`.

### Frontend

`cd frontend`

`npm install`

`npm run dev`

Defina `NEXT_PUBLIC_API_URL` apontando para o backend.

### Regra clínica do software

O sistema não prescreve, altera dose, ensina técnica de injeção ou autoriza administração. A verificação visual é uma camada de apoio. Qualquer incerteza resulta em bloqueio.

## Fase 3 — Auditoria de verificações

Cada tentativa de verificação que chega ao modelo gera um registro em `verification_logs`, incluindo `trace_id`, prescrição, local, resultado, confiança, modelo e alertas.
Nenhuma imagem é persistida pelo registro de auditoria. Resultados `APPROVED` continuam gerando o registro operacional em `injection_logs`.

A auditoria é somente de rastreabilidade; não transforma a saída da IA em autorização médica e não permite atuação física automática.

## Fase 4 — Histórico seguro de verificações

Foi adicionado `GET /api/v1/verification-history?user_id=...&limit=20` para consulta somente leitura dos registros de auditoria do utilizador.
O retorno não contém a imagem capturada e limita a consulta a 50 registros. Alertas visuais e flags booleanas são devolvidos em formato estruturado.
Esta camada é observabilidade do software; autenticação/autorização de utilizadores deve ser adicionada antes de exposição pública.
