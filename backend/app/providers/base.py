from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

@dataclass
class ProviderResult:
    text: str
    provider: str
    model: str

class VisionProvider(ABC):
    name: str
    model: str
    @abstractmethod
    async def verify_image(self, image_b64: str, mime_type: str, prompt: str) -> ProviderResult: ...

class TextProvider(ABC):
    name: str
    model: str
    @abstractmethod
    async def generate(self, messages: list[dict[str, Any]]) -> ProviderResult: ...
