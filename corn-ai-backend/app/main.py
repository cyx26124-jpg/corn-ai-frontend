"""
Corn AI Disease Detection Backend
===================================
Entry point for the FastAPI application.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.detector import detector
from app.logger import app_logger
from app.routes import router
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

app = FastAPI()
origins = [
    "https://ana-untellable-claretha.ngrok-free.dev",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    app_logger.info(f"🌽 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    app_logger.info(f"   YOLO model ready : {detector.is_ready}")
    app_logger.info(f"   Device           : {detector.device}")
    app_logger.info(f"   Uploads dir      : {settings.UPLOADS_DIR}")

    yield  # ← app runs here

    app_logger.info("Shutting down gracefully …")


# ─── App Factory ──────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Production-ready backend for AI-powered corn disease detection "
            "using YOLOv26 and DeepSeek LLM diagnosis."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    application.include_router(router, prefix="")

    # Global exception handler
    @application.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        app_logger.exception(f"Unhandled exception on {request.url}: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected server error occurred."},
        )

    return application

app = create_app()


# ─── Dev entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
