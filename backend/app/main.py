import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .ai_router import AIProviderRouter
from .config import settings
from .schemas import VerificationEnvelope, SiteOut
from .store import store
from .text_router import TextRouter
from .auth import current_user_id, enforce_user

app = FastAPI(title="Projeto Seringa AI", version="0.2.1")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response

app.add_middleware(SecurityHeadersMiddleware)
allowed_origins = [x.strip() for x in (settings.frontend_origins or "http://localhost:3000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=False,
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Accept"])
router = AIProviderRouter()
text_router = TextRouter()
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_CHAT_CHARS = 4000

@app.get("/health")
async def health():
    return {"status":"ok","service":"syringe-ai","version":"0.2.1"}

@app.post("/api/v1/verify-injection", response_model=VerificationEnvelope)
async def verify_injection(image: UploadFile = File(...), prescription_id: str = Form(...),
                           selected_site_id: str = Form(...), user_id: str = Form(...),
                           authenticated_user_id: str | None = Depends(current_user_id)):
    user_id = enforce_user(user_id, authenticated_user_id)
    prescription = store.get_prescription(prescription_id)
    if not prescription or prescription["user_id"] != user_id:
        raise HTTPException(404, "PRESCRIPTION_NOT_FOUND")
    site = store.get_site(selected_site_id)
    if not site:
        raise HTTPException(404, "SITE_NOT_FOUND")
    if store.site_status(site) == "blocked":
        raise HTTPException(409, "SITE_RESTING")
    if image.content_type not in {"image/jpeg","image/png","image/webp"}:
        raise HTTPException(415, "UNSUPPORTED_IMAGE_TYPE")
    raw = await image.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "IMAGE_TOO_LARGE")
    result = await router.verify(base64.b64encode(raw).decode(), image.content_type,
                                 float(prescription["default_dose"]), prescription["medication_name"])
    store.log_verification(user_id, prescription_id, selected_site_id, result)
    log_id = None
    if result.status == "APPROVED":
        log = store.log_injection(user_id, selected_site_id, result.detected_dose, None,
                                  "APPROVED", "Software visual verification passed; not medical authorization.")
        log_id = log["id"]
    sites = store.next_sites(user_id)
    next_site = None
    for site in sites:
        if site["id"] != selected_site_id and site["status"] == "recommended":
            next_site = SiteOut(**site); break
    return VerificationEnvelope(verification=result, log_id=log_id, next_site=next_site)

@app.get("/api/v1/verification-history")
async def verification_history(user_id: str, limit: int = 20, authenticated_user_id: str | None = Depends(current_user_id)):
    user_id = enforce_user(user_id, authenticated_user_id)
    if not user_id.strip():
        raise HTTPException(400, "INVALID_USER_ID")
    return store.verification_history(user_id, limit)

@app.get("/api/v1/body-map/next-site", response_model=list[SiteOut])
async def next_site(user_id: str, authenticated_user_id: str | None = Depends(current_user_id)):
    user_id = enforce_user(user_id, authenticated_user_id)
    return [SiteOut(**x) for x in store.next_sites(user_id)]

@app.post("/api/v1/chat")
async def chat(payload: dict, authenticated_user_id: str | None = Depends(current_user_id)):
    _ = authenticated_user_id
    text = str(payload.get("message", "")).strip()
    if not text: raise HTTPException(400, "EMPTY_MESSAGE")
    if len(text) > MAX_CHAT_CHARS: raise HTTPException(413, "MESSAGE_TOO_LARGE")
    return await text_router.generate(text)
