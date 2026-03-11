# 🌽 Corn AI Disease Detection Backend

A **production-ready FastAPI backend** that combines **YOLOv26 object detection** with the **DeepSeek LLM** to deliver automated corn disease diagnosis for agricultural applications.

---

## Features

- **YOLOv26 Inference** — detect corn diseases in uploaded images with bounding boxes and confidence scores
- **DeepSeek LLM Diagnosis** — AI-generated expert reports covering symptoms, causes, treatments, pesticides, and prevention
- **Full Pipeline Endpoint** — single request handles detection + diagnosis
- **Camera / IoT Support** — accepts base64-encoded live frames
- **GPU-accelerated** inference when CUDA is available
- **Production patterns** — structured logging, CORS, Pydantic validation, modular architecture

---

## Project Structure

```
corn-ai-backend/
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI app factory & lifespan
│   ├── config.py           # Pydantic settings (env-driven)
│   ├── routes.py           # All API endpoint definitions
│   ├── schemas.py          # Request / response Pydantic models
│   ├── detector.py         # YOLO singleton wrapper
│   ├── deepseek_client.py  # DeepSeek API async client
│   ├── services.py         # Business logic / orchestration
│   ├── utils.py            # Image helpers, file utilities
│   └── logger.py           # Loguru setup
├── weights/
│   └── yolov26_corn_disease.pt   # ← place your model here
├── uploads/                      # auto-created at startup
├── logs/                         # auto-created at startup
├── requirements.txt
├── .env.example
└── README.md
```

---

## Prerequisites

- Python 3.10+
- pip
- *(optional)* CUDA-capable GPU + matching PyTorch build

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/corn-ai-backend.git
cd corn-ai-backend
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

**CPU only:**
```bash
pip install -r requirements.txt
```

**GPU (CUDA 12.x):**
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DEEPSEEK_API_KEY=sk-your-actual-key-here
```

### 5. Add your YOLO model weights

Place your trained model file at:

```
weights/yolov26_corn_disease.pt
```

> **Note:** The server will start without the weights file, but detection endpoints will return `503 Service Unavailable` until the file is present.

---

## Running the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API docs will be available at:

| Interface | URL |
|-----------|-----|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## API Reference

### `GET /health`

Server health check.

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok",
  "app_name": "Corn AI Disease Detection Backend",
  "version": "1.0.0",
  "model_loaded": true,
  "device": "cuda",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### `POST /detect`

Upload a corn leaf image and receive disease detections.

```bash
curl -X POST http://localhost:8000/detect \
  -F "file=@/path/to/corn_leaf.jpg"
```

**Response:**
```json
{
  "detections": [
    {
      "disease": "Corn Leaf Blight",
      "confidence": 0.94,
      "bbox": [120.0, 80.0, 300.0, 260.0],
      "class_id": 2
    }
  ],
  "image_width": 640,
  "image_height": 480,
  "inference_time_ms": 38.4,
  "timestamp": "2024-01-15T10:30:01Z"
}
```

---

### `POST /diagnosis`

Request an AI diagnosis for a known disease name.

```bash
curl -X POST http://localhost:8000/diagnosis \
  -H "Content-Type: application/json" \
  -d '{
    "disease_name": "Corn Leaf Blight",
    "confidence": 0.94
  }'
```

**Response:**
```json
{
  "disease_name": "Corn Leaf Blight",
  "diagnosis": "## 1. Symptom Description\nCorn Leaf Blight (Northern Corn Leaf Blight) presents as long, cigar-shaped gray-green lesions ...",
  "timestamp": "2024-01-15T10:30:05Z"
}
```

---

### `POST /detect_and_diagnose`

Full one-shot pipeline: upload image → detect → diagnose.

```bash
curl -X POST http://localhost:8000/detect_and_diagnose \
  -F "file=@/path/to/corn_leaf.jpg"
```

**Response:**
```json
{
  "detections": [...],
  "diagnosis": "## 1. Symptom Description\n...",
  "primary_disease": "Corn Leaf Blight",
  "image_width": 640,
  "image_height": 480,
  "inference_time_ms": 42.1,
  "timestamp": "2024-01-15T10:30:06Z"
}
```

---

### `POST /camera_frame`

Send a base64-encoded camera frame.

```bash
curl -X POST http://localhost:8000/camera_frame \
  -H "Content-Type: application/json" \
  -d '{
    "frame": "/9j/4AAQSkZJRgABAQAA...",
    "run_diagnosis": false
  }'
```

**Response:**
```json
{
  "detections": [...],
  "diagnosis": null,
  "inference_time_ms": 35.2,
  "timestamp": "2024-01-15T10:30:07Z"
}
```

---

## Supported Disease Classes

The model supports any classes present in your training dataset. Common corn diseases include:

| Class | Disease |
|-------|---------|
| 0 | Corn Common Rust |
| 1 | Northern Corn Leaf Blight |
| 2 | Corn Gray Leaf Spot |
| 3 | Corn Healthy |

---

## Configuration Reference

All settings can be overridden via environment variables or `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | — | **Required.** Your DeepSeek API key |
| `DEEPSEEK_MODEL` | `deepseek-chat` | DeepSeek model identifier |
| `DEEPSEEK_MAX_TOKENS` | `2048` | Max tokens in LLM response |
| `DEEPSEEK_TEMPERATURE` | `0.7` | LLM temperature |
| `YOLO_MODEL_PATH` | `weights/yolov26_corn_disease.pt` | Path to weights |
| `YOLO_CONFIDENCE_THRESHOLD` | `0.25` | Min detection confidence |
| `YOLO_IOU_THRESHOLD` | `0.45` | NMS IoU threshold |
| `YOLO_IMAGE_SIZE` | `640` | Inference resolution |
| `YOLO_DEVICE` | `auto` | `auto`, `cpu`, `cuda`, `0` |
| `MAX_UPLOAD_SIZE_MB` | `10` | Max image upload size |
| `DEBUG` | `false` | Enable reload & debug logs |

---

## Architecture Overview

```
┌─────────────┐     HTTP      ┌──────────────────────────────────────┐
│   Client    │ ────────────► │  FastAPI (routes.py)                 │
│ (mobile /   │               │                                      │
│  browser /  │               │  ┌─────────────┐  ┌───────────────┐ │
│  IoT)       │               │  │ services.py │  │  schemas.py   │ │
└─────────────┘               │  └──────┬──────┘  └───────────────┘ │
                               │         │                            │
                               │  ┌──────▼──────┐  ┌──────────────┐ │
                               │  │ detector.py │  │ deepseek_    │ │
                               │  │  (YOLO)     │  │ client.py    │ │
                               │  └─────────────┘  └──────┬───────┘ │
                               └─────────────────────────│──────────┘
                                                          │  HTTPS
                                                    ┌─────▼──────┐
                                                    │ DeepSeek   │
                                                    │    API     │
                                                    └────────────┘
```

---

## Development

### Running tests (example with pytest)

```bash
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

### Code formatting

```bash
pip install black isort
black app/
isort app/
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.
