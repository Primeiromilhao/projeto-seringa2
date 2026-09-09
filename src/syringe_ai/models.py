from dataclasses import dataclass, field
from typing import Any

@dataclass
class Message:
    role: str
    content: str

@dataclass
class AIRequest:
    user_input: str
    session_id: str = "default"
    metadata: dict[str, Any] = field(default_factory=dict)

@dataclass
class AIResponse:
    text: str
    session_id: str
    model: str
    provider: str
    safety: str = "PASS"
    trace_id: str = ""

@dataclass
class Decision:
    kind: str
    summary: str
    requires_tool: bool = False
    tool_name: str | None = None
    parameters: dict[str, Any] = field(default_factory=dict)

@dataclass
class AIConfig:
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 1200
    memory_turns: int = 12
