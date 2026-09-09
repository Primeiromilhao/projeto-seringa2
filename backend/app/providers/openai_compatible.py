import httpx
from typing import Any
from .base import VisionProvider, TextProvider, ProviderResult

class OpenAICompatibleVision(VisionProvider):
    def __init__(self, name: str, base_url: str, api_key: str | None, model: str, timeout: float = 45):
        self.name, self.model, self.base_url = name, model, base_url.rstrip("/")
        self.api_key, self.timeout = api_key or "ollama", timeout

    async def verify_image(self, image_b64: str, mime_type: str, prompt: str) -> ProviderResult:
        data_url = f"data:{mime_type};base64,{image_b64}"
        payload = {"model": self.model, "temperature": 0, "max_tokens": 700,
                   "messages": [{"role":"system","content":prompt},
                     {"role":"user","content":[{"type":"text","text":"Verify this image."},
                      {"type":"image_url","image_url":{"url":data_url}}]}]}
        headers = {"Content-Type":"application/json"}
        if self.api_key and self.api_key != "ollama": headers["Authorization"] = f"Bearer {self.api_key}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            r.raise_for_status()
            return ProviderResult(r.json()["choices"][0]["message"]["content"], self.name, self.model)

class OpenAICompatibleText(TextProvider):
    def __init__(self, name: str, base_url: str, api_key: str | None, model: str, timeout: float = 45):
        self.name, self.model, self.base_url = name, model, base_url.rstrip("/")
        self.api_key, self.timeout = api_key or "ollama", timeout

    async def generate(self, messages: list[dict[str, Any]]) -> ProviderResult:
        payload = {"model":self.model,"temperature":0.2,"max_tokens":1200,"messages":messages}
        headers = {"Content-Type":"application/json"}
        if self.api_key and self.api_key != "ollama": headers["Authorization"] = f"Bearer {self.api_key}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            r.raise_for_status()
            return ProviderResult(r.json()["choices"][0]["message"]["content"], self.name, self.model)
