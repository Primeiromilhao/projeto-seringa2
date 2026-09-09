from pydantic import BaseModel, Field
from typing import Literal

class VerificationResult(BaseModel):
    confidence_score: float = Field(ge=0, le=1)
    detected_dose: float
    prescribed_dose: float
    dose_match: bool
    medication_match: bool = False
    visual_issues: list[str] = Field(default_factory=list)
    status: Literal["APPROVED", "WARNING", "BLOCKED"]
    action_message: str
    provider: str = ""
    model: str = ""
    trace_id: str = ""

class Prescription(BaseModel):
    id: str
    user_id: str
    medication_name: str
    default_dose: float
    unit: str
    frequency: str

class SiteOut(BaseModel):
    id: str
    name: str
    quadrant: str
    last_used_at: str | None
    is_resting: bool
    status: Literal["recommended", "resting", "blocked"]

class VerificationEnvelope(BaseModel):
    verification: VerificationResult
    log_id: str | None = None
    next_site: SiteOut | None = None
