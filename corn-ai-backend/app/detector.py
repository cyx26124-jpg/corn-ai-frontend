"""
YOLO model singleton wrapper.
Exposes predict_frame() used by services.py.
"""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from app.config import settings
from app.logger import app_logger

# ─── 中文标签映射 ──────────────────────────────────────────────────────────────
DISEASE_NAME_ZH: dict[str, str] = {
    "Gray_leaf_spot":       "玉米灰斑病",
    "Leaf_spot":            "玉米叶斑病",
    "Rust":                 "玉米锈病",
    "Healthy":              "健康",
    "gray_leaf_spot":       "玉米灰斑病",
    "leaf_spot":            "玉米叶斑病",
    "rust":                 "玉米锈病",
    "healthy":              "健康",
    "Common_Rust":          "玉米锈病",
    "Northern_Leaf_Blight": "玉米叶斑病",
}


class CornDiseaseDetector:
    """线程安全的 YOLO 单例包装器。"""

    _instance: "CornDiseaseDetector | None" = None
    _lock = threading.Lock()

    def __new__(cls) -> "CornDiseaseDetector":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._model: Any = None
        self._device: str = "cpu"
        self._ready: bool = False
        self._initialized = True
        self._load_model()

    def _load_model(self) -> None:
        model_path = Path(settings.YOLO_MODEL_PATH)
        if not model_path.exists():
            app_logger.warning(
                f"权重文件不存在：{model_path}，检测器未就绪。"
            )
            return

        try:
            from ultralytics import YOLO

            # 选择设备
            import torch
            if settings.YOLO_DEVICE == "auto":
                self._device = "cuda" if torch.cuda.is_available() else "cpu"
            else:
                self._device = settings.YOLO_DEVICE

            app_logger.info(
                f"正在加载 YOLO 模型：{model_path}，设备：{self._device} ..."
            )
            self._model = YOLO(str(model_path))
            self._model.to(self._device)
            self._ready = True
            app_logger.info("YOLO 模型加载成功 ✅")
        except Exception as exc:
            app_logger.error(f"YOLO 模型加载失败：{exc}")
            self._ready = False

    # ── 对外属性 ──────────────────────────────────────────────────────────────

    @property
    def is_ready(self) -> bool:
        return self._ready

    @property
    def device(self) -> str:
        return self._device

    # ── 核心推理 ──────────────────────────────────────────────────────────────

    def predict_frame(self, frame: np.ndarray) -> list[dict]:
        """
        对一帧 BGR numpy 图像运行 YOLO。

        返回列表，每个元素格式：
        {
            "class":    "Gray_leaf_spot",   # 英文原始标签
            "class_zh": "玉米灰斑病",       # 中文标签
            "conf":     0.92,
            "bbox":     [x1, y1, x2, y2],  # 绝对像素坐标
            "class_id": 0,
        }
        """
        if not self._ready or self._model is None:
            return []

        try:
            results = self._model.predict(
                source=frame,
                conf=settings.YOLO_CONFIDENCE_THRESHOLD,
                save=False,
                verbose=False,
                device=self._device,
            )
        except Exception as exc:
            app_logger.error(f"[predict_frame] 推理出错：{exc}")
            return []

        detections: list[dict] = []
        for result in results:
            for box in result.boxes:
                cls_id    = int(box.cls[0])
                conf      = float(box.conf[0])
                label_en  = self._model.names[cls_id]
                label_zh  = DISEASE_NAME_ZH.get(label_en, label_en)
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]

                detections.append({
                    "class":    label_en,
                    "class_zh": label_zh,
                    "conf":     round(conf, 4),
                    "bbox":     [round(x1, 2), round(y1, 2),
                                 round(x2, 2), round(y2, 2)],
                    "class_id": cls_id,
                })

        return detections

    def predict_image_file(self, image_path: str | Path) -> list[dict]:
        """从文件路径读取图片并推理。"""
        frame = cv2.imread(str(image_path))
        if frame is None:
            raise ValueError(f"无法读取图片：{image_path}")
        return self.predict_frame(frame)


# ── 单例 ──────────────────────────────────────────────────────────────────────
detector = CornDiseaseDetector()
