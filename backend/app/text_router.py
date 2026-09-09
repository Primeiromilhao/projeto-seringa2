import uuid
from .config import settings
from .prompts import TEXT_SYSTEM_PROMPT
from .providers.openai_compatible import OpenAICompatibleText

class TextRouter:
    def __init__(self):
        s=settings
        self.providers={
          "openrouter":OpenAICompatibleText("openrouter",s.openrouter_base_url,s.openrouter_api_key,s.openrouter_model,s.ai_timeout_seconds),
          "ollama":OpenAICompatibleText("ollama",s.ollama_base_url,None,s.ollama_text_model,s.ai_timeout_seconds),
          "gemini":OpenAICompatibleText("gemini",s.gemini_base_url,s.gemini_api_key,s.gemini_model,s.ai_timeout_seconds),
          "groq":OpenAICompatibleText("groq",s.groq_base_url,s.groq_api_key,s.groq_model,s.ai_timeout_seconds),
          "openai":OpenAICompatibleText("openai",s.premium_openai_base_url,s.premium_openai_api_key,s.premium_openai_model,s.ai_timeout_seconds)}
    async def generate(self,user_text:str):
        chain=[settings.ai_provider,settings.ai_fallback_provider,"ollama"]
        seen=set(); errors=[]
        for name in chain:
            if name in seen: continue
            seen.add(name); p=self.providers.get(name)
            if not p: continue
            if name!="ollama" and not p.api_key: continue
            try:
                r=await p.generate([{"role":"system","content":TEXT_SYSTEM_PROMPT},{"role":"user","content":user_text}])
                return {"text":r.text,"provider":r.provider,"model":r.model,"trace_id":str(uuid.uuid4())}
            except Exception as exc: errors.append(f"{name}:{type(exc).__name__}")
        return {"text":"O serviço de IA está indisponível. Tente novamente mais tarde.","provider":"fallback-blocked","model":"none","trace_id":str(uuid.uuid4()),"errors":errors}
