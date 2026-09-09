import json, uuid
from .config import settings
from .prompts import VISION_SYSTEM_PROMPT
from .providers.openai_compatible import OpenAICompatibleVision
from .schemas import VerificationResult

class AIProviderRouter:
    """Strategy/Adapter router. Default is free online -> local Ollama fallback."""
    def __init__(self):
        self.providers = self._build()

    def _build(self):
        s = settings
        return {
          "openrouter": OpenAICompatibleVision("openrouter", s.openrouter_base_url, s.openrouter_api_key, s.openrouter_model, s.ai_timeout_seconds),
          "ollama": OpenAICompatibleVision("ollama", s.ollama_base_url, None, s.ollama_vision_model, s.ai_timeout_seconds),
          "gemini": OpenAICompatibleVision("gemini", s.gemini_base_url, s.gemini_api_key, s.gemini_model, s.ai_timeout_seconds),
          "groq": OpenAICompatibleVision("groq", s.groq_base_url, s.groq_api_key, s.groq_model, s.ai_timeout_seconds),
          "openai": OpenAICompatibleVision("openai", s.premium_openai_base_url, s.premium_openai_api_key, s.premium_openai_model, s.ai_timeout_seconds),
        }

    def _parse(self, raw: str, prescribed_dose: float, medication_name: str, provider, trace_id: str):
        text = raw.strip().replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(text)
            result = VerificationResult.model_validate(data)
        except Exception:
            return VerificationResult(confidence_score=0, detected_dose=0, prescribed_dose=prescribed_dose,
                dose_match=False, medication_match=False, visual_issues=["resposta_ia_invalida"],
                status="BLOCKED", action_message="Não foi possível validar a imagem com segurança. Tire uma nova foto.",
                provider=provider.name, model=provider.model, trace_id=trace_id)
        result.prescribed_dose = prescribed_dose
        if not result.dose_match or not result.medication_match or result.confidence_score < 0.90:
            result.status = "BLOCKED"
        if result.status != "BLOCKED" and result.visual_issues:
            result.status = "WARNING"
        result.provider, result.model, result.trace_id = provider.name, provider.model, trace_id
        return result

    async def verify(self, image_b64: str, mime_type: str, prescribed_dose: float, medication_name: str):
        trace_id = str(uuid.uuid4())
        preferred = settings.ai_provider
        chain = [preferred]
        if settings.ai_fallback_provider not in chain: chain.append(settings.ai_fallback_provider)
        if "ollama" not in chain: chain.append("ollama")
        last_error = None
        prompt = VISION_SYSTEM_PROMPT + f"\nPRESCRIBED MEDICATION: {medication_name}\nPRESCRIBED DOSE: {prescribed_dose}\n"
        for name in chain:
            provider = self.providers.get(name)
            if not provider: continue
            if name != "ollama" and not provider.api_key: continue
            try:
                response = await provider.verify_image(image_b64, mime_type, prompt)
                return self._parse(response.text, prescribed_dose, medication_name, provider, trace_id)
            except Exception as exc:
                last_error = exc
        return VerificationResult(confidence_score=0, detected_dose=0, prescribed_dose=prescribed_dose,
          dose_match=False, medication_match=False, visual_issues=["provedor_indisponivel"], status="BLOCKED",
          action_message="O serviço de verificação está indisponível. Nenhuma decisão de injeção deve ser tomada com o sistema indisponível.",
          provider="fallback-blocked", model="none", trace_id=trace_id)
