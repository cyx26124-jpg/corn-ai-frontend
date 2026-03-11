"""
YOLOv8/v11/v26 Corn Disease Detector
-------------------------------------
Uses the Ultralytics YOLO API to run inference on corn-leaf images
and returns structured detection results.
"""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from app.config import settings
from app.logger import app_logger
from app.schemas import DetectionResult


class CornDiseaseDetector:
    """
    Thread-safe singleton wrapper around the Ultralytics YOLO model.

    Usage
    -----
    detector = CornDiseaseDetector()
    results  = detector.detect("path/to/image.jpg")
    """

    _instance: Optional["CornDiseaseDetector"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "CornDiseaseDetector":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialized = False
                    cls._instance = instance
        return cls._instance

    # ──────────────────────────────────────────────────────────────────────────

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model = None
        self.device: str = self._resolve_device(settings.YOLO_DEVICE)
        self._load_model()

    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _resolve_device(device_setting: str) -> str:
        if device_setting == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device_setting

    def _load_model(self) -> None:
        model_path = Path(settings.YOLO_MODEL_PATH)

        if not model_path.exists():
            app_logger.warning(
                f"YOLO weight file not found at '{model_path}'. "
                "Detection will be unavailable until a valid .pt file is placed there."
            )
            return

        try:
            from ultralytics import YOLO  # lazy import — avoids startup crash if not installed

            app_logger.info(f"Loading YOLO model from '{model_path}' on device '{self.device}' …")
            self.model = YOLO(str(model_path))
            self.model.to(self.device)
            app_logger.info("YOLO model loaded successfully.")
        except Exception as exc:
            app_logger.error(f"Failed to load YOLO model: {exc}")
            self.model = None

    # ──────────────────────────────────────────────────────────────────────────

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    # ──────────────────────────────────────────────────────────────────────────

    def detect(
        self,
        source: "str | Path | np.ndarray",
        conf: Optional[float] = None,
        iou: Optional[float] = None,
        imgsz: Optional[int] = None,
    ) -> list[DetectionResult]:
        """
        Run YOLO inference on *source* and return a list of DetectionResult objects.

        Parameters
        ----------
        source  : file path, URL, or numpy array (BGR, HWC)
        conf    : confidence threshold (defaults to settings value)
        iou     : IoU threshold for NMS (defaults to settings value)
        imgsz   : inference image size (defaults to settings value)
        """
        if not self.is_ready:
            app_logger.error("Detector called but model is not loaded.")
            return []

        conf  = conf  or settings.YOLO_CONFIDENCE_THRESHOLD
        iou   = iou   or settings.YOLO_IOU_THRESHOLD
        imgsz = imgsz or settings.YOLO_IMAGE_SIZE

        try:
            results = self.model(
                source,
                conf=conf,
                iou=iou,
                imgsz=imgsz,
                verbose=False,
            )
        except Exception as exc:
            app_logger.error(f"Inference error: {exc}")
            return []

        return self._parse_results(results)

    # ──────────────────────────────────────────────────────────────────────────

    # 英文类名 → 中文映射
    DISEASE_NAME_ZH: dict[str, str] = {
        "Gray_leaf_spot": "玉米灰斑病",
        "Healthy":        "健康",
        "Leaf_spot":      "玉米叶斑病",
        "Rust":           "玉米锈病",
    }

    @staticmethod
    def _parse_results(results) -> list[DetectionResult]:
        """Convert raw Ultralytics Results into DetectionResult schema objects."""
        detections: list[DetectionResult] = []

        for result in results:
            names = result.names  # {class_id: class_name}

            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id   = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                bbox_xyxy  = box.xyxy[0].tolist()   # [x1, y1, x2, y2]
                en_name    = names.get(class_id, f"class_{class_id}")
                disease    = CornDiseaseDetector.DISEASE_NAME_ZH.get(en_name, en_name)

                detections.append(
                    DetectionResult(
                        disease=disease,
                        confidence=round(confidence, 4),
                        bbox=[round(v, 2) for v in bbox_xyxy],
                        class_id=class_id,
                    )
                )

        # Sort by confidence descending
        detections.sort(key=lambda d: d.confidence, reverse=True)
        return detections

    # ──────────────────────────────────────────────────────────────────────────

    def detect_batch(self, sources: list) -> list[list[DetectionResult]]:
        """Run detection on a batch of images at once (more GPU-efficient)."""
        if not self.is_ready:
            return [[] for _ in sources]
        try:
            results = self.model(sources, verbose=False)
            return [self._parse_results([r]) for r in results]
        except Exception as exc:
            app_logger.error(f"Batch inference error: {exc}")
            return [[] for _ in sources]


# Module-level singleton — importable directly
detector = CornDiseaseDetector()
