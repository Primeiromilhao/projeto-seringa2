from abc import ABC, abstractmethod
from ..models import Message

class ModelProvider(ABC):
    name = "unknown"

    @abstractmethod
    def generate(self, messages: list[Message], model: str, temperature: float, max_tokens: int) -> str:
        raise NotImplementedError
