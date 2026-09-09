# Deploy zero-custo — Fase 1

## 1. Local/self-hosted (recommended for the first real test)

Copy `.env.example` to `.env` and keep `AI_PROVIDER=openrouter`.
Add an OpenRouter key if available; leave Gemini/Groq keys optional.

Install Ollama models:
`ollama pull qwen3-vl:4b`
`ollama pull qwen3:4b`

Run:
`docker compose up --build`

The API is then available at `http://localhost:8000`.

## 2. Supabase Free

Create a Free project and execute `db/schema.sql` in the SQL editor.
Set `SUPABASE_URL` and a server-only `SUPABASE_KEY` in the backend environment.
Never expose the Supabase service key in the browser.

Free projects have limited storage/compute and can pause after inactivity.

## 3. Vercel Hobby

Deploy `frontend/` as a Next.js project.
Set `NEXT_PUBLIC_API_URL` to the public backend URL.

## 4. Render Free / Koyeb free where available

Deploy the FastAPI backend from `backend/`.
Use the provided start command:
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Important: a small free cloud instance is not an Ollama GPU host. Keep Ollama as a local/self-hosted fallback unless a suitable free compute resource is actually available.

## 5. Free AI chain

Cloud-first:
`OpenRouter free -> Gemini free -> safe BLOCKED`

Local/self-hosted:
`OpenRouter free -> Gemini free -> Ollama Qwen3-VL -> safe BLOCKED`

Premium later:
change only `AI_PROVIDER=openai` and premium environment variables.
No core refactor is required.
