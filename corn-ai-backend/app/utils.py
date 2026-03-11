import base64
import io
import time
import uuid
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from fastapi import HTTPException, UploadFile

from app.config import settings
from app.logger import app_logger


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving the original extension."""
    suffix = Path(original_filename).suffix or ".jpg"
    return f"{uuid.uuid4().hex}{suffix}"


async def validate_and_save_upload(file: UploadFile) -> Path:
    """
    Validate content-type, enforce max file size, save to uploads dir.
    Returns the saved file path.
    """
    # Content-type validation
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. "
                   f"Allowed: {settings.ALLOWED_IMAGE_TYPES}",
        )

    content = await file.read()

    # Size validation
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    filename = generate_unique_filename(file.filename or "upload.jpg")
    save_path = settings.UPLOADS_DIR / filename

    save_path.write_bytes(content)
    app_logger.debug(f"Saved uploaded file → {save_path}")
    return save_path


def decode_base64_image(b64_string: str) -> np.ndarray:
    """
    Decode a base64-encoded image string into an OpenCV-compatible numpy array.
    Handles optional data-URI prefix (e.g. 'data:image/jpeg;base64,...').
    """
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(b64_string)
        np_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("cv2.imdecode returned None — invalid image data.")
        return image
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {exc}") from exc


def save_base64_frame(b64_string: str) -> Path:
    """Decode a base64 frame, save it, and return the path."""
    image = decode_base64_image(b64_string)
    filename = f"frame_{uuid.uuid4().hex}.jpg"
    save_path = settings.UPLOADS_DIR / filename
    cv2.imwrite(str(save_path), image)
    return save_path


def get_image_dimensions(image_path: Path) -> tuple[int, int]:
    """Return (width, height) of an image file."""
    with Image.open(image_path) as img:
        return img.width, img.height


def pil_to_opencv(pil_image: Image.Image) -> np.ndarray:
    """Convert a PIL Image to an OpenCV BGR numpy array."""
    rgb = np.array(pil_image.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def opencv_to_pil(cv_image: np.ndarray) -> Image.Image:
    """Convert an OpenCV BGR numpy array to a PIL Image."""
    rgb = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


class Timer:
    """Simple context-manager timer."""

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.elapsed_ms = (time.perf_counter() - self._start) * 1000

    @property
    def elapsed(self) -> float:
        return self.elapsed_ms
