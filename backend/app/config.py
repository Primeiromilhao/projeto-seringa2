from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Projeto Seringa AI"
    environment: str = "local"
    frontend_origins: str = "http://localhost:3000"
    supabase_jwt_secret: str | None = None
    ai_provider: str = "openrouter"
    ai_fallback_provider: str = "gemini"
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openrouter/free"
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_vision_model: str = "qwen3-vl:4b"
    ollama_text_model: str = "qwen3:4b"
    gemini_api_key: str | None = None
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    gemini_model: str = "gemini-3.8-flash"
    groq_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "openai/gpt-oss-20b"
    premium_openai_api_key: str | None = None
    premium_openai_base_url: str = "https://api.openai.com/v1"
    premium_openai_model: str = "gpt-4o"
    ai_timeout_seconds: float = 45.0
    sqlite_path: str = "./data/syringe.db"
    supabase_url: str | None = None
    supabase_key: str | None = None
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
