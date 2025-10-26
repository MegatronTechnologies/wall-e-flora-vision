# YOLO Detection Scripts - Improvement Proposals

## Текущие проблемы и предложения по улучшению

---

## 1. 🚀 Performance Optimization

### Проблема: Низкий FPS на Raspberry Pi
**Текущее состояние:** ~10-15 FPS с полной обработкой каждого кадра

**Предложения:**

#### A. Frame Skipping (пропуск кадров)
```python
# Обрабатывать каждый N-й кадр
PROCESS_EVERY_N_FRAMES = int(os.getenv("RS_PROCESS_EVERY_N", "3"))

frame_counter = 0
while not self.stop_event.is_set():
    frames = self.pipeline.wait_for_frames(timeout_ms=5000)
    frame_counter += 1

    if frame_counter % PROCESS_EVERY_N_FRAMES != 0:
        # Просто обновить latest_frame без inference
        with self.lock:
            self.state.latest_frame = frame.copy()
        continue

    # Полная обработка только для каждого 3-го кадра
    results = self.model(frame, verbose=False)
```

**Эффект:** FPS увеличится в 2-3 раза, inference будет реже

---

#### B. Async HTTP Endpoints
```python
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=3)

def _send_detection_async(self, *args):
    """Отправка в облако в отдельном потоке"""
    future = executor.submit(self._send_detection, *args)
    future.add_done_callback(self._handle_send_result)

def _handle_send_result(self, future):
    try:
        result = future.result()
        print(f"[INFO] Send completed: {result}")
    except Exception as exc:
        print(f"[ERROR] Send failed: {exc}")
```

**Эффект:** Основной loop не блокируется во время HTTP requests

---

#### C. Model Optimization
```python
# Использовать TensorRT или ONNX Runtime для ускорения
# Или уменьшить размер входного изображения

def preprocess_frame(frame, target_size=(416, 416)):
    """Уменьшить разрешение перед inference"""
    resized = cv2.resize(frame, target_size)
    return resized

# В loop:
results = self.model(preprocess_frame(frame), verbose=False)
```

**Эффект:** Inference в 2-4 раза быстрее (но может снизить точность)

---

## 2. 🔄 Reliability & Robustness

### Проблема: Камера может отключиться, скрипт упадёт

**Предложение: Auto-reconnect для RealSense**

```python
def _start_pipeline(self, max_retries=5) -> None:
    for attempt in range(max_retries):
        try:
            self.pipeline.start(self.cfg)
            print(f"[INFO] RealSense pipeline запущен")
            return
        except Exception as exc:
            print(f"[WARN] Попытка {attempt+1}/{max_retries} не удалась: {exc}")
            time.sleep(2)
    raise SystemExit("Не удалось запустить RealSense после нескольких попыток")

def _loop(self) -> None:
    consecutive_errors = 0
    while not self.stop_event.is_set():
        try:
            frames = self.pipeline.wait_for_frames(timeout_ms=5000)
            # ... обработка ...
            consecutive_errors = 0  # Сброс при успехе

        except RuntimeError as exc:
            consecutive_errors += 1
            print(f"[ERROR] Frame error: {exc}")

            if consecutive_errors >= 10:
                print("[WARN] Слишком много ошибек, переподключаем камеру...")
                self.pipeline.stop()
                time.sleep(2)
                self._start_pipeline()
                consecutive_errors = 0
```

**Эффект:** Скрипт не падает при временных проблемах с камерой

---

### Проблема: Нет мониторинга здоровья системы

**Предложение: Health Check Endpoint**

```python
@app.route("/health")
def health():
    """Health check для monitoring систем"""
    with service.lock:
        last_frame_age = time.time() - service.state.latest_timestamp

        status = "healthy"
        if last_frame_age > 30:
            status = "degraded"  # Нет новых кадров больше 30 секунд
        if last_frame_age > 60:
            status = "unhealthy"

        return jsonify({
            "status": status,
            "uptime": time.time() - service.start_time,
            "last_frame_age_seconds": last_frame_age,
            "avg_fps": service.state.avg_fps,
            "total_detections_sent": service.total_sent,
        }), 200 if status == "healthy" else 503
```

**Эффект:** Можно настроить мониторинг через Prometheus/Grafana или простой ping

---

## 3. 📊 Logging & Debugging

### Проблема: Print statements разбросаны, нет уровней логирования

**Предложение: Structured Logging**

```python
import logging
from logging.handlers import RotatingFileHandler

# Setup в начале файла
def setup_logging():
    logger = logging.getLogger("yolo_detect")
    logger.setLevel(logging.INFO)

    # Console handler
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))

    # File handler с ротацией
    file_handler = RotatingFileHandler(
        'yolo_detect.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    ))

    logger.addHandler(console)
    logger.addHandler(file_handler)
    return logger

logger = setup_logging()

# Использование:
logger.info("RealSense pipeline started")
logger.debug(f"Frame processed: {frame.shape}")
logger.error(f"Failed to send detection: {exc}", exc_info=True)
logger.warning(f"Low FPS detected: {fps}")
```

**Эффект:**
- Логи сохраняются в файл
- Разные уровни (DEBUG/INFO/WARN/ERROR)
- Автоматическая ротация файлов
- Stack traces при ошибках

---

## 4. 🎯 Feature Enhancements

### A. Configurable Detection Zones (ROI)

**Проблема:** Обрабатывается весь кадр, даже ненужные области

```python
# Environment variables для ROI
ROI_X = int(os.getenv("RS_ROI_X", "0"))
ROI_Y = int(os.getenv("RS_ROI_Y", "0"))
ROI_WIDTH = int(os.getenv("RS_ROI_WIDTH", str(FRAME_WIDTH)))
ROI_HEIGHT = int(os.getenv("RS_ROI_HEIGHT", str(FRAME_HEIGHT)))

def extract_roi(frame):
    """Вырезать область интереса"""
    if ROI_WIDTH == FRAME_WIDTH and ROI_HEIGHT == FRAME_HEIGHT:
        return frame
    return frame[ROI_Y:ROI_Y+ROI_HEIGHT, ROI_X:ROI_X+ROI_WIDTH]

# В loop:
roi = extract_roi(frame)
results = self.model(roi, verbose=False)
```

**Эффект:** Быстрее inference, меньше false positives

---

### B. Video Recording при детекции

```python
class VideoRecorder:
    def __init__(self, output_dir="recordings"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.writer = None
        self.recording = False

    def start_recording(self, filename, fps, frame_size):
        if self.recording:
            return
        path = self.output_dir / filename
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.writer = cv2.VideoWriter(str(path), fourcc, fps, frame_size)
        self.recording = True

    def write_frame(self, frame):
        if self.recording and self.writer:
            self.writer.write(frame)

    def stop_recording(self):
        if self.writer:
            self.writer.release()
        self.recording = False

# В DetectionService:
self.recorder = VideoRecorder()

# При детекции diseased:
if status == "diseased" and not self.recorder.recording:
    filename = f"diseased_{timestamp}.mp4"
    self.recorder.start_recording(filename, FRAME_RATE, (FRAME_WIDTH, FRAME_HEIGHT))
    self.recording_started_at = time.time()

# Остановить через 30 секунд
if self.recorder.recording and time.time() - self.recording_started_at > 30:
    self.recorder.stop_recording()
```

**Эффект:** Автоматическая запись видео при обнаружении болезни

---

### C. Webhook Notifications

```python
WEBHOOK_URL = os.getenv("WEBHOOK_URL")  # Slack/Discord/Telegram

def send_webhook(status, confidence, image_url):
    if not WEBHOOK_URL:
        return

    payload = {
        "text": f"🚨 Deteksiya: {status} ({confidence}%)",
        "attachments": [{
            "image_url": image_url,
            "color": "danger" if status == "diseased" else "good"
        }]
    }

    try:
        requests.post(WEBHOOK_URL, json=payload, timeout=5)
    except Exception as exc:
        logger.warning(f"Webhook failed: {exc}")
```

**Эффект:** Мгновенные уведомления в Slack/Discord

---

### D. Configuration File Support

**Проблема:** Слишком много environment variables

```python
import yaml

def load_config(config_path="config.yaml"):
    """Загрузить конфигурацию из YAML файла"""
    defaults = {
        "model_path": "best_ncnn_model",
        "camera": {
            "width": 640,
            "height": 480,
            "fps": 15,
        },
        "detection": {
            "confidence_threshold": 0.5,
            "send_interval": 15,
            "process_every_n_frames": 1,
        },
        "server": {
            "host": "0.0.0.0",
            "port": 8080,
        },
        "cloud": {
            "device_id": None,
            "api_key": None,
            "endpoint": None,
        }
    }

    if Path(config_path).exists():
        with open(config_path, 'r') as f:
            user_config = yaml.safe_load(f)
            # Merge с defaults
            defaults.update(user_config)

    return defaults

config = load_config()
FRAME_WIDTH = config["camera"]["width"]
# etc...
```

**config.yaml пример:**
```yaml
model_path: best_ncnn_model

camera:
  width: 640
  height: 480
  fps: 15

detection:
  confidence_threshold: 0.5
  send_interval: 15
  process_every_n_frames: 3  # Обрабатывать каждый 3-й кадр

server:
  host: 0.0.0.0
  port: 8080

cloud:
  device_id: raspi-001
  endpoint: https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection

recording:
  enabled: true
  duration: 30  # секунд
  on_status: ["diseased", "mixed"]
```

**Эффект:** Удобнее управлять настройками, не нужно экспортировать множество переменных

---

## 5. 🔒 Security Improvements

### A. API Authentication

```python
API_TOKEN = os.getenv("API_TOKEN")  # Для защиты endpoints

from functools import wraps
from flask import request

def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or token != f"Bearer {API_TOKEN}":
            return jsonify({"error": "unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route("/detect", methods=["POST"])
@require_token  # Защищено
def detect():
    # ...
```

---

### B. CORS Configuration

```python
from flask_cors import CORS

# Только разрешённые origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
CORS(app, origins=ALLOWED_ORIGINS)
```

---

### C. Rate Limiting

```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_requests=10, window=60):
        self.requests = defaultdict(list)
        self.max_requests = max_requests
        self.window = window

    def is_allowed(self, client_ip):
        now = time.time()
        # Удалить старые записи
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            return False

        self.requests[client_ip].append(now)
        return True

limiter = RateLimiter(max_requests=20, window=60)

@app.before_request
def check_rate_limit():
    client_ip = request.remote_addr
    if not limiter.is_allowed(client_ip):
        return jsonify({"error": "rate_limit_exceeded"}), 429
```

---

## 6. 📈 Monitoring & Metrics

### Prometheus Metrics Export

```python
from prometheus_client import Counter, Histogram, Gauge, generate_latest

# Метрики
detections_total = Counter('detections_total', 'Total detections', ['status'])
inference_duration = Histogram('inference_duration_seconds', 'Inference duration')
fps_gauge = Gauge('current_fps', 'Current FPS')
frame_errors = Counter('frame_errors_total', 'Total frame errors')

# В loop:
with inference_duration.time():
    results = self.model(frame, verbose=False)

detections_total.labels(status=status).inc()
fps_gauge.set(fps_value)

@app.route("/metrics")
def metrics():
    return Response(generate_latest(), mimetype='text/plain')
```

---

## 7. 🧪 Testing & Quality

### A. Unit Tests

```python
# test_detection.py
import pytest
import numpy as np

def test_summarize_detections():
    # Mock boxes
    from unittest.mock import MagicMock

    mock_box = MagicMock()
    mock_box.conf.item.return_value = 0.85
    mock_box.cls.item.return_value = 0  # chrysanthemum

    boxes = [mock_box]
    labels = {0: "chrysanthemum"}

    status, conf, count = summarize_detections(boxes, labels)

    assert status == "healthy"
    assert conf == 85.0
    assert count == 1

def test_encode_frame():
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    result = encode_frame_to_base64(frame, "test.jpg")

    assert "data" in result
    assert "filename" in result
    assert result["content_type"] == "image/jpeg"
```

---

### B. Integration Test Script

```bash
#!/bin/bash
# test_endpoints.sh

set -e

BASE_URL="http://localhost:8080"

echo "Testing /status endpoint..."
curl -f "$BASE_URL/status" | jq .

echo "Testing /snapshot endpoint..."
curl -f "$BASE_URL/snapshot" -o /tmp/test_snapshot.jpg
file /tmp/test_snapshot.jpg  # Should be JPEG

echo "Testing /detect endpoint..."
curl -f -X POST "$BASE_URL/detect" | jq .

echo "All tests passed!"
```

---

## 8. 🎨 old-yolo.py Specific Improvements

### A. Добавить MJPEG endpoint

```python
# old-yolo.py уже имеет /stream, но можно улучшить:

@app.route("/stream.mjpg")
def stream_mjpg():
    """MJPEG stream с правильными headers"""
    return Response(
        mjpeg_stream(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )
```

---

### B. Добавить Grid View для нескольких камер

```python
@app.route("/grid")
def grid_view():
    """HTML страница с сеткой камер"""
    return """
    <html>
    <head><title>Camera Grid</title></head>
    <body style="margin:0; background:#000;">
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:2px;">
            <img src="/stream" style="width:100%;">
            <img src="/stream" style="width:100%;">
        </div>
    </body>
    </html>
    """
```

---

## Priority Roadmap (Приоритетный план)

### 🔴 High Priority (Срочно)
1. ✅ Auto-reconnect для камеры
2. ✅ Structured logging в файл
3. ✅ Health check endpoint
4. ✅ Frame skipping для производительности

### 🟡 Medium Priority (Желательно)
5. ⏳ Configuration file (YAML)
6. ⏳ Video recording при детекции
7. ⏳ API authentication
8. ⏳ Rate limiting

### 🟢 Low Priority (По возможности)
9. ⏳ Prometheus metrics
10. ⏳ Unit tests
11. ⏳ Webhook notifications
12. ⏳ ROI configuration

---

## Готовые решения для быстрого старта

### Установить дополнительные зависимости:

```bash
pip3 install flask-cors pyyaml prometheus-client
```

### Базовая структура улучшенного проекта:

```
Desktop/megtech/
├── yolo_detect.py          # Основной скрипт (улучшенный)
├── config.yaml             # Конфигурация
├── requirements.txt        # Зависимости
├── logs/
│   └── yolo_detect.log     # Логи
├── recordings/             # Записи видео
├── tests/
│   ├── test_detection.py
│   └── test_endpoints.sh
└── utils/
    ├── logger.py           # Logging setup
    ├── rate_limiter.py     # Rate limiting
    └── video_recorder.py   # Video recording
```

---

## Хочешь, чтобы я реализовал какие-то из этих улучшений?

Могу сразу добавить:
1. 🔄 Auto-reconnect логику
2. 📝 Structured logging
3. ❤️ Health check endpoint
4. ⚡ Frame skipping для производительности
5. 📁 Config file support

Какие улучшения наиболее важны для тебя?
