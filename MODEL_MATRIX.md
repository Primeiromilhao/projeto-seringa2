# Model Matrix — Fase 1

## Free-first production path

1. OpenRouter `openrouter/free` — primary online router. It dynamically selects free models and filters for image understanding, structured output and other capabilities.
2. Google Gemini API — optional second online free tier through the OpenAI-compatible endpoint.
3. Ollama `qwen3-vl:4b` — local vision fallback.
4. Ollama `qwen3:4b` — local text assistant.
5. Groq — optional free-tier OpenAI-compatible text adapter.

## Premium path

Set `AI_PROVIDER=openai` and configure `PREMIUM_OPENAI_API_KEY` / `PREMIUM_OPENAI_MODEL`.
The core code does not change.

## Why this combination

- Vision needs a multimodal model; local Qwen3-VL is a current Ollama vision option.
- Text assistance can use a smaller Qwen3 locally to keep hardware requirements manageable.
- OpenRouter free gives a single OpenAI-compatible gateway and can route among currently available free models.
- Gemini is also exposed through an OpenAI-compatible API, so it fits the same adapter contract.
- Groq is OpenAI-compatible and is useful as an optional text-only capacity source.

## Medical safety

The model never authorizes an injection. `APPROVED` means only that the configured visual checks passed.
The application blocks when evidence is ambiguous, confidence is below threshold, medication/dose do not match,
or the provider is unavailable.
