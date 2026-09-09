from collections import defaultdict, deque
from .models import Message

class MemoryStore:
    """In-memory session history; persistence can be added without changing AICore."""
    def __init__(self, max_messages: int = 24):
        self._sessions = defaultdict(lambda: deque(maxlen=max_messages))

    def add(self, session_id: str, role: str, content: str) -> None:
        self._sessions[session_id].append(Message(role, content))

    def history(self, session_id: str, limit: int = 24) -> list[Message]:
        items = list(self._sessions[session_id])
        return items[-limit:]

    def clear(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def snapshot(self, session_id: str) -> list[dict[str, str]]:
        return [m.__dict__.copy() for m in self.history(session_id)]
