import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Corn AI Disease Detection Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    ALLOWED_ORIGINS: list[str] = ["*"]

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    WEIGHTS_DIR: Path = BASE_DIR / "weights"
    UPLOADS_DIR: Path = BASE_DIR / "uploads"
    LOGS_DIR: Path = BASE_DIR / "logs"

    # YOLO Model
    YOLO_MODEL_PATH: str = "weights/yolov26_corn_disease.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.25
    YOLO_IOU_THRESHOLD: float = 0.45
    YOLO_IMAGE_SIZE: int = 640
    YOLO_DEVICE: str = "auto"  # "auto", "cpu", "cuda", "0", "1"

    # DeepSeek API
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "YOUR_DEEPSEEK_API_KEY")
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_MAX_TOKENS: int = 2048
    DEEPSEEK_TEMPERATURE: float = 0.7
    DEEPSEEK_TIMEOUT: int = 60

    # Upload
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/jpg", "image/webp"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

# Ensure required directories exist
for directory in [settings.UPLOADS_DIR, settings.WEIGHTS_DIR, settings.LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)
