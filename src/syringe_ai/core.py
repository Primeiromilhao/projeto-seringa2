from pathlib import Path
from .models import AIConfig, AIRequest, AIResponse, Message
from .memory import MemoryStore
from .safety import SafetyPolicy
from .audit import AuditLog
from .providers import OpenAIProvider

class AICore:
    """The project's reasoning brain; isolated from all physical control."""
    def __init__(self, config: AIConfig | None = None, provider=None, data_dir: str | Path = "memory"):
        self.config = config or AIConfig()
        self.memory = MemoryStore(self.config.memory_turns * 2)
        self.safety = SafetyPolicy()
        self.audit = AuditLog(Path(data_dir) / "ai_audit.jsonl")
        self.provider = provider or self._make_provider()

    def _make_provider(self):
        if self.config.provider == "openai":
            return OpenAIProvider()
        raise ValueError(f"Unsupported provider: {self.config.provider}")

    def respond(self, request: AIRequest) -> AIResponse:
        ok, reason = self.safety.validate_input(request.user_input)
        if not ok:
            raise ValueError(reason)
        trace_id = self.audit.record("request", session_id=request.session_id)
        messages = [Message("system", self.safety.system_rules())]
        messages += self.memory.history(request.session_id, self.config.memory_turns)
        messages.append(Message("user", request.user_input))
        text = self.provider.generate(messages, self.config.model,
                                      self.config.temperature, self.config.max_tokens)
        self.memory.add(request.session_id, "user", request.user_input)
        self.memory.add(request.session_id, "assistant", text)
        self.audit.record("response", session_id=request.session_id, trace_id=trace_id,
                          model=self.config.model)
        return AIResponse(text=text, session_id=request.session_id,
                          model=self.config.model, provider=self.provider.name,
                          trace_id=trace_id)

    def clear_session(self, session_id: str) -> None:
        self.memory.clear(session_id)
