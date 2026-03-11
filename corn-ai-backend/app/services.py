"""
Business-logic service layer.
Orchestrates the detector and DeepSeek client.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from app.deepseek_client import deepseek_client
from app.detector import detector
from app.logger import app_logger
from app.schemas import (
    CameraFrameResponse,
    DetectAndDiagnoseResponse,
    DetectionResponse,
    DetectionResult,
    DiagnosisResponse,
)
from app.utils import Timer, get_image_dimensions, save_base64_frame


# ─── Detection Service ────────────────────────────────────────────────────────

async def run_detection(image_path: Path) -> DetectionResponse:
    """Run YOLO detection on a saved image file."""
    width, height = get_image_dimensions(image_path)

    with Timer() as t:
        detections = detector.detect(str(image_path))

    app_logger.info(
        f"Detection complete: {len(detections)} object(s) found in {t.elapsed:.1f} ms"
    )

    return DetectionResponse(
        detections=detections,
        image_width=width,
        image_height=height,
        inference_time_ms=round(t.elapsed, 2),
    )


# ─── Diagnosis Service ────────────────────────────────────────────────────────

async def run_diagnosis(
    disease_name: str,
    confidence: Optional[float] = None,
    additional_context: Optional[str] = None,
) -> DiagnosisResponse:
    """Call DeepSeek API and return a structured diagnosis."""
    diagnosis_text = await deepseek_client.get_diagnosis(
        disease_name=disease_name,
        confidence=confidence,
        additional_context=additional_context,
    )
    return DiagnosisResponse(disease_name=disease_name, diagnosis=diagnosis_text)


# ─── Combined Pipeline ────────────────────────────────────────────────────────

async def run_detect_and_diagnose(image_path: Path) -> DetectAndDiagnoseResponse:
    """
    Full pipeline:
    1. YOLO detection
    2. DeepSeek diagnosis on the top-confidence detection
    """
    width, height = get_image_dimensions(image_path)

    with Timer() as t:
        detections: list[DetectionResult] = detector.detect(str(image_path))

    inference_ms = round(t.elapsed, 2)
    app_logger.info(f"Pipeline detection: {len(detections)} object(s) in {inference_ms} ms")

    diagnosis_text: Optional[str] = None
    primary_disease: Optional[str] = None

    if detections:
        top = detections[0]  # already sorted by confidence
        primary_disease = top.disease
        try:
            diagnosis_text = await deepseek_client.get_diagnosis(
                disease_name=top.disease,
                confidence=top.confidence,
            )
        except RuntimeError as exc:
            app_logger.warning(f"Diagnosis skipped: {exc}")
            diagnosis_text = f"[Diagnosis unavailable: {exc}]"

    return DetectAndDiagnoseResponse(
        detections=detections,
        diagnosis=diagnosis_text,
        primary_disease=primary_disease,
        image_width=width,
        image_height=height,
        inference_time_ms=inference_ms,
    )


# ─── Camera Frame Service ─────────────────────────────────────────────────────

async def run_camera_frame(
    b64_frame: str,
    run_diagnosis_flag: bool = False,
) -> CameraFrameResponse:
    """Decode a base64 camera frame, detect diseases, optionally diagnose."""
    frame_path = save_base64_frame(b64_frame)

    with Timer() as t:
        detections = detector.detect(str(frame_path))

    inference_ms = round(t.elapsed, 2)

    diagnosis_text: Optional[str] = None
    if run_diagnosis_flag and detections:
        try:
            diagnosis_text = await deepseek_client.get_diagnosis(
                disease_name=detections[0].disease,
                confidence=detections[0].confidence,
            )
        except RuntimeError as exc:
            app_logger.warning(f"Camera frame diagnosis skipped: {exc}")

    return CameraFrameResponse(
        detections=detections,
        diagnosis=diagnosis_text,
        inference_time_ms=inference_ms,
    )
