import json
import time
import uuid
from pathlib import Path

class AuditLog:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, event: str, **data) -> str:
        trace_id = uuid.uuid4().hex
        item = {"ts": time.time(), "trace_id": trace_id, "event": event, **data}
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
        return trace_id
