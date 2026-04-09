"""
Business logic: Detection, Diagnosis, Camera Frame, Pipeline.
"""

from __future__ import annotations

import base64
import time
from pathlib import Path

import cv2
import numpy as np

from app.detector import detector
from app.logger import app_logger
from app.schemas import (
    CameraFrameResponse,
    DetectAndDiagnoseResponse,
    DetectionResponse,
    DetectionResult,
    DiagnosisResponse,
)

# ─── 中文病害名映射（与 yolo_detector 的英文标签对应）──────────────────────────
DISEASE_NAME_ZH: dict[str, str] = {
    "Gray_leaf_spot": "玉米灰斑病",
    "Leaf_spot":      "玉米叶斑病",
    "Rust":           "玉米锈病",
    "Healthy":        "健康",
    # 兼容小写和其他可能的标签
    "gray_leaf_spot": "玉米灰斑病",
    "leaf_spot":      "玉米叶斑病",
    "rust":           "玉米锈病",
    "healthy":        "健康",
    "Common_Rust":    "玉米锈病",
    "Northern_Leaf_Blight": "玉米叶斑病",
}


def _label_to_zh(label: str) -> str:
    """把英文类别名转为中文，找不到就原样返回。"""
    return DISEASE_NAME_ZH.get(label, label)


def _decode_base64_to_frame(b64_str: str) -> np.ndarray:
    """
    把 base64 字符串解码成 OpenCV BGR 图像。
    支持带 data:image/... 前缀或纯 base64。
    """
    # 去掉 data:image/jpeg;base64, 前缀（如果有）
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]

    img_bytes = base64.b64decode(b64_str)
    np_arr   = np.frombuffer(img_bytes, dtype=np.uint8)
    frame    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("无法解码图像，请检查 base64 数据是否正确。")

    return frame


def _run_yolo_on_frame(frame: np.ndarray) -> tuple[list[DetectionResult], int, int, float]:
    """
    对一帧 numpy 图像运行 YOLO，返回 (detections, width, height, inference_ms)。
    """
    h, w = frame.shape[:2]
    t0 = time.perf_counter()

    # 调用 detector 单例（app/detector.py 里的 CornDiseaseDetector 包装）
    raw_results = detector.predict_frame(frame)   # 见下方 detector.py 补充

    inference_ms = (time.perf_counter() - t0) * 1000

    detections: list[DetectionResult] = []
    for r in raw_results:
        # r 格式：{"class": "Gray_leaf_spot", "conf": 0.92, "bbox": [x1,y1,x2,y2]}
        disease_en = r.get("class") or r.get("class_en") or r.get("label") or "Unknown"
        disease_zh = _label_to_zh(disease_en)
        conf       = float(r.get("conf") or r.get("confidence") or 0.0)
        bbox       = r.get("bbox") or [0.0, 0.0, float(w), float(h)]

        detections.append(DetectionResult(
            disease    = disease_zh,
            confidence = round(conf, 4),
            bbox       = [round(v, 2) for v in bbox],
            class_id   = r.get("class_id"),
        ))

    return detections, w, h, inference_ms


# ─── 对外服务函数 ──────────────────────────────────────────────────────────────

async def run_detection(image_path: Path) -> DetectionResponse:
    """读取已保存的图片文件，运行 YOLO，返回 DetectionResponse。"""
    frame = cv2.imread(str(image_path))
    if frame is None:
        raise ValueError(f"无法读取图片：{image_path}")

    detections, w, h, ms = _run_yolo_on_frame(frame)

    app_logger.info(
        f"[run_detection] {len(detections)} 个目标  |  {ms:.1f} ms  |  {w}x{h}"
    )
    return DetectionResponse(
        detections      = detections,
        image_width     = w,
        image_height    = h,
        inference_time_ms = ms,
    )


async def run_camera_frame(
    b64_frame: str,
    run_diagnosis_flag: bool = False,
) -> CameraFrameResponse:
    """解码 base64 帧，运行 YOLO，可选 LLM 诊断，返回 CameraFrameResponse。"""
    frame = _decode_base64_to_frame(b64_frame)
    detections, _, _, ms = _run_yolo_on_frame(frame)

    diagnosis: str | None = None
    if run_diagnosis_flag and detections:
        top = max(detections, key=lambda d: d.confidence)
        try:
            diag_resp = await run_diagnosis(disease_name=top.disease, confidence=top.confidence)
            diagnosis = diag_resp.diagnosis
        except Exception as exc:
            app_logger.warning(f"[run_camera_frame] 诊断失败（忽略）: {exc}")

    app_logger.info(
        f"[run_camera_frame] {len(detections)} 个目标  |  {ms:.1f} ms"
    )
    return CameraFrameResponse(
        detections        = detections,
        diagnosis         = diagnosis,
        inference_time_ms = ms,
    )


async def run_detect_and_diagnose(image_path: Path) -> DetectAndDiagnoseResponse:
    """完整流水线：图片检测 + LLM 诊断。"""
    frame = cv2.imread(str(image_path))
    if frame is None:
        raise ValueError(f"无法读取图片：{image_path}")

    detections, w, h, ms = _run_yolo_on_frame(frame)

    diagnosis: str | None = None
    primary: str | None   = None

    if detections:
        top = max(detections, key=lambda d: d.confidence)
        primary = top.disease
        try:
            diag_resp = await run_diagnosis(disease_name=top.disease, confidence=top.confidence)
            diagnosis = diag_resp.diagnosis
        except Exception as exc:
            app_logger.warning(f"[run_detect_and_diagnose] 诊断失败: {exc}")

    return DetectAndDiagnoseResponse(
        detections        = detections,
        diagnosis         = diagnosis,
        primary_disease   = primary,
        image_width       = w,
        image_height      = h,
        inference_time_ms = ms,
    )


async def run_diagnosis(
    disease_name: str,
    confidence: float | None = None,
    additional_context: str | None = None,
) -> DiagnosisResponse:
    """调用 DeepSeek LLM 生成农业诊断报告。"""
    from app.deepseek_client import ask_deepseek   # 延迟导入避免循环

    prompt_parts = [f"检测到玉米病害：{disease_name}"]
    if confidence is not None:
        prompt_parts.append(f"置信度：{confidence * 100:.1f}%")
    if additional_context:
        prompt_parts.append(f"附加信息：{additional_context}")

    prompt_parts += [
        "",
        "请作为专业农业专家，详细提供：",
        "1. 病害症状描述",
        "2. 发病原因分析",
        "3. 防治方法与推荐农药",
        "4. 预防措施",
        "请用中文回答，语言专业简洁。",
    ]

    diagnosis_text = await ask_deepseek("\n".join(prompt_parts))

    return DiagnosisResponse(
        disease_name = disease_name,
        diagnosis    = diagnosis_text,
    )
