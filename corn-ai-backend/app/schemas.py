from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── Detection Schemas ────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left x coordinate")
    y1: float = Field(..., description="Top-left y coordinate")
    x2: float = Field(..., description="Bottom-right x coordinate")
    y2: float = Field(..., description="Bottom-right y coordinate")

    @property
    def as_list(self) -> list[float]:
        return [self.x1, self.y1, self.x2, self.y2]


class DetectionResult(BaseModel):
    disease: str = Field(..., description="Detected disease class name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    bbox: list[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")
    class_id: Optional[int] = Field(None, description="Class index from model")


class DetectionResponse(BaseModel):
    detections: list[DetectionResult] = Field(default=[], description="List of detected diseases")
    image_width: Optional[int] = Field(None, description="Original image width in pixels")
    image_height: Optional[int] = Field(None, description="Original image height in pixels")
    inference_time_ms: Optional[float] = Field(None, description="Model inference duration (ms)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ─── Diagnosis Schemas ────────────────────────────────────────────────────────

class DiagnosisRequest(BaseModel):
    disease_name: str = Field(..., min_length=1, description="Detected disease name")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Detection confidence")
    additional_context: Optional[str] = Field(None, description="Extra context for the LLM")


class DiagnosisResponse(BaseModel):
    disease_name: str
    diagnosis: str = Field(..., description="AI-generated expert diagnosis text")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ─── Combined Pipeline Schemas ────────────────────────────────────────────────

class DetectAndDiagnoseResponse(BaseModel):
    detections: list[DetectionResult] = Field(default=[])
    diagnosis: Optional[str] = Field(None, description="AI-generated diagnosis (for top detection)")
    primary_disease: Optional[str] = Field(None, description="Highest-confidence detected disease")
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    inference_time_ms: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ─── Camera Frame Schemas ─────────────────────────────────────────────────────

class CameraFrameRequest(BaseModel):
    frame: str = Field(..., description="Base64-encoded image frame")
    run_diagnosis: bool = Field(False, description="Whether to also run LLM diagnosis")


class CameraFrameResponse(BaseModel):
    detections: list[DetectionResult] = Field(default=[])
    diagnosis: Optional[str] = None
    inference_time_ms: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ─── Health Check Schemas ─────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    app_name: str
    version: str
    model_loaded: bool
    device: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
