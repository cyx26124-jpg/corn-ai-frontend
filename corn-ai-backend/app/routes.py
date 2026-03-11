"""
FastAPI route definitions.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.detector import detector
from app.logger import app_logger
from app.schemas import (
    CameraFrameRequest,
    CameraFrameResponse,
    DetectAndDiagnoseResponse,
    DetectionResponse,
    DiagnosisRequest,
    DiagnosisResponse,
    HealthResponse,
)
from app.services import (
    run_camera_frame,
    run_detect_and_diagnose,
    run_detection,
    run_diagnosis,
)
from app.utils import validate_and_save_upload

router = APIRouter()


# ─── Health Check ─────────────────────────────────────────────────────────────

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    tags=["System"],
)
async def health_check() -> HealthResponse:
    """Returns server status and model availability."""
    return HealthResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        model_loaded=detector.is_ready,
        device=detector.device if detector.is_ready else None,
    )


# ─── Detection ────────────────────────────────────────────────────────────────

@router.post(
    "/detect",
    response_model=DetectionResponse,
    summary="Detect corn diseases in an uploaded image",
    tags=["Detection"],
)
async def detect_endpoint(
    file: UploadFile = File(..., description="Corn leaf image (JPEG / PNG / WEBP)"),
) -> DetectionResponse:
    """
    Upload an image and receive a list of detected corn diseases with
    bounding boxes and confidence scores.
    """
    if not detector.is_ready:
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded. Please place a valid .pt file at the configured path.",
        )

    image_path = await validate_and_save_upload(file)
    app_logger.info(f"[/detect] Processing image: {image_path.name}")

    try:
        result = await run_detection(image_path)
    except Exception as exc:
        app_logger.error(f"[/detect] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    return result


# ─── Diagnosis ────────────────────────────────────────────────────────────────

@router.post(
    "/diagnosis",
    response_model=DiagnosisResponse,
    summary="Get AI-powered agricultural diagnosis for a detected disease",
    tags=["Diagnosis"],
)
async def diagnosis_endpoint(body: DiagnosisRequest) -> DiagnosisResponse:
    """
    Send a detected disease name to the DeepSeek LLM and receive an expert
    agricultural diagnosis including symptoms, causes, treatments, pesticides,
    and prevention strategies.
    """
    app_logger.info(f"[/diagnosis] Requesting diagnosis for: '{body.disease_name}'")

    try:
        result = await run_diagnosis(
            disease_name=body.disease_name,
            confidence=body.confidence,
            additional_context=body.additional_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        app_logger.error(f"[/diagnosis] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    return result


# ─── Combined Pipeline ────────────────────────────────────────────────────────

@router.post(
    "/detect_and_diagnose",
    response_model=DetectAndDiagnoseResponse,
    summary="Full pipeline: detect disease → AI diagnosis",
    tags=["Pipeline"],
)
async def detect_and_diagnose_endpoint(
    file: UploadFile = File(..., description="Corn leaf image (JPEG / PNG / WEBP)"),
) -> DetectAndDiagnoseResponse:
    """
    One-shot endpoint:
    1. Runs YOLOv26 object detection.
    2. Passes the top-confidence detection to DeepSeek for diagnosis.
    3. Returns the full report in a single response.
    """
    if not detector.is_ready:
        raise HTTPException(
            status_code=503,
            detail="YOLO model is not loaded.",
        )

    image_path = await validate_and_save_upload(file)
    app_logger.info(f"[/detect_and_diagnose] Processing image: {image_path.name}")

    try:
        result = await run_detect_and_diagnose(image_path)
    except Exception as exc:
        app_logger.error(f"[/detect_and_diagnose] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    return result


# ─── Camera Frame ─────────────────────────────────────────────────────────────

@router.post(
    "/camera_frame",
    response_model=CameraFrameResponse,
    summary="Run YOLO detection on a base64-encoded camera frame",
    tags=["Detection"],
)
async def camera_frame_endpoint(body: CameraFrameRequest) -> CameraFrameResponse:
    """
    Accept a base64-encoded image frame (e.g., from a webcam or IoT device)
    and run corn disease detection. Optionally includes AI diagnosis.
    """
    if not detector.is_ready:
        raise HTTPException(status_code=503, detail="YOLO model is not loaded.")

    app_logger.info(f"[/camera_frame] Processing frame (diagnosis={body.run_diagnosis})")

    try:
        result = await run_camera_frame(
            b64_frame=body.frame,
            run_diagnosis_flag=body.run_diagnosis,
        )
    except HTTPException:
        raise
    except Exception as exc:
        app_logger.error(f"[/camera_frame] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    return result
