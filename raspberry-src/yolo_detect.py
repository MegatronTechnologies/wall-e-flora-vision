#!/usr/bin/env python3
"""
Единый сервис для съёмки с Intel RealSense, инференса YOLO и публикации
результатов в Lovable Cloud, а также выдачи HTTP snapshot/status.

Основные возможности:
    * Захват цветового потока с RealSense (по умолчанию 640x480 @ 15fps).
    * Инференс Ultralytics YOLO для определения статуса растений.
    * Периодическая отправка результатов (основной кадр в base64 + JSON)
      на эндпоинт Lovable Cloud (используются переменные окружения).
    * HTTP-сервер (Flask) с маршрутами /snapshot и /status для внешних сервисов.

Необходимые переменные окружения:
    RASPBERRY_PI_DEVICE_ID  – идентификатор устройства (обязателен для отправки).
    RASPBERRY_PI_API_KEY    – Bearer токен Lovable Cloud. Без него отправка отключена.
    RASPBERRY_PI_ENDPOINT   – URL POST эндпоинта (по умолчанию Supabase функц. из README).
    RASPBERRY_PI_USER_TOKEN – Токен пользователя для автоматической отправки (опционально).
                              Если не установлен, автоматическая отправка отключена.
                              Используйте Dashboard для ручной детекции.

Дополнительные опции:
    YOLO_MODEL_PATH (default: "best_ncnn_model")
    RS_FRAME_WIDTH / RS_FRAME_HEIGHT / RS_FRAME_RATE
    RS_SEND_INTERVAL  (секунды между отправками, default: 15)
    RS_STREAM_HOST    (default: "0.0.0.0")
    RS_STREAM_PORT    (default: 8080)
    RS_ENABLE_DISPLAY (default: "0") - Включить OpenCV окно и клавиатурные команды (Q/P/S/F)
    RS_CONF_THRESHOLD (default: 0.5) - Минимальная уверенность для отображения детекций
    RS_JPEG_QUALITY   (default: 90) - Качество JPEG для стриминга
"""

from __future__ import annotations

import base64
import logging
import os
import signal
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Tuple

import cv2
import numpy as np
import requests
from flask import Flask, Response, jsonify, request
from ultralytics import YOLO

from supabase_client import SupabaseDetectionWriter

try:
    import pyrealsense2 as rs
except ImportError as exc:
    raise SystemExit(
        "pyrealsense2 (librealsense2) не найден. Установите пакет: pip install pyrealsense2"
    ) from exc


# -----------------------------
# Logging Setup
# -----------------------------
def setup_logging() -> logging.Logger:
    """Setup structured logging with file output (overwrites on each run)."""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "yolo_detect.log"

    # Remove old log file on startup
    if log_file.exists():
        log_file.unlink()

    logger = logging.getLogger("yolo_detect")
    logger.setLevel(logging.DEBUG)

    # Console handler (INFO level)
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))

    # File handler (DEBUG level)
    file_handler = logging.FileHandler(log_file, mode='w', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))

    logger.addHandler(console)
    logger.addHandler(file_handler)

    return logger


logger = setup_logging()

# -----------------------------
# Константы и настройки
# -----------------------------
MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "best_ncnn_model")
FRAME_WIDTH = int(os.getenv("RS_FRAME_WIDTH", "1280"))
FRAME_HEIGHT = int(os.getenv("RS_FRAME_HEIGHT", "720"))
FRAME_RATE = int(os.getenv("RS_FRAME_RATE", "15"))
SEND_INTERVAL = float(os.getenv("RS_SEND_INTERVAL", "15"))
STREAM_HOST = os.getenv("RS_STREAM_HOST", "0.0.0.0")
STREAM_PORT = int(os.getenv("RS_STREAM_PORT", "8080"))
CONF_THRESHOLD = float(os.getenv("RS_CONF_THRESHOLD", "0.5"))
JPEG_QUALITY = int(os.getenv("RS_JPEG_QUALITY", "90"))
ENABLE_DISPLAY = os.getenv("RS_ENABLE_DISPLAY", "0").lower() in {"1", "true", "yes"}
WINDOW_NAME = "YOLO Detection Results"

DEVICE_ID = os.getenv("RASPBERRY_PI_DEVICE_ID")
API_KEY = os.getenv("RASPBERRY_PI_API_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
USER_TOKEN = os.getenv("RASPBERRY_PI_USER_TOKEN")  # User auth token for automatic sending
ENDPOINT = os.getenv(
    "RASPBERRY_PI_ENDPOINT",
    "https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection",
)


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def summarize_detections(boxes, labels) -> Tuple[str, Optional[float], int]:
    if boxes is None or len(boxes) == 0:
        return "noObjects", None, 0

    has_mealybug = False
    has_chrysanthemum = False
    highest_conf = 0.0
    kept = 0

    for box in boxes:
        conf = float(box.conf.item())
        if conf < CONF_THRESHOLD:
            continue
        kept += 1
        highest_conf = max(highest_conf, conf * 100.0)
        class_idx = int(box.cls.item())
        classname = str(labels.get(class_idx, class_idx)).lower()
        if "mealybug" in classname:
            has_mealybug = True
        if "chrysanthemum" in classname:
            has_chrysanthemum = True

    if kept == 0:
        return "noObjects", None, 0
    if has_mealybug and has_chrysanthemum:
        return "mixed", highest_conf, kept
    if has_mealybug:
        return "diseased", highest_conf, kept
    return "healthy", highest_conf, kept


def calculate_iou(box1, box2) -> float:
    """Calculate Intersection over Union (IoU) between two bounding boxes."""
    x1_min, y1_min, x1_max, y1_max = box1
    x2_min, y2_min, x2_max, y2_max = box2

    # Calculate intersection area
    inter_x_min = max(x1_min, x2_min)
    inter_y_min = max(y1_min, y2_min)
    inter_x_max = min(x1_max, x2_max)
    inter_y_max = min(y1_max, y2_max)

    if inter_x_max < inter_x_min or inter_y_max < inter_y_min:
        return 0.0

    inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)

    # Calculate union area
    box1_area = (x1_max - x1_min) * (y1_max - y1_min)
    box2_area = (x2_max - x2_min) * (y2_max - y2_min)
    union_area = box1_area + box2_area - inter_area

    if union_area == 0:
        return 0.0

    return inter_area / union_area


def analyze_detection_with_crops(frame: np.ndarray, boxes, labels_dict: Dict) -> Dict[str, object]:
    """
    Analyze detection frame and create crops for each chrysanthemum plant.

    Returns:
        {
            "main_image_b64": str,
            "plant_images_b64": List[str],
            "overall_status": str,
            "plant_statuses": List[Dict],
            "confidence": float
        }
    """
    h, w = frame.shape[:2]

    if boxes is None or len(boxes) == 0:
        # No objects detected
        main_image_b64 = encode_frame_to_base64(frame, "main.jpg")["data"]
        return {
            "main_image_b64": main_image_b64,
            "plant_images_b64": [],
            "overall_status": "noObjects",
            "plant_statuses": [],
            "confidence": None
        }

    # Collect chrysanthemum and mealybug detections
    chrysanthemums = []
    mealybugs = []

    for box in boxes:
        conf = float(box.conf.item())
        if conf < CONF_THRESHOLD:
            continue

        class_idx = int(box.cls.item())
        classname = labels_dict.get(class_idx, str(class_idx)).lower()

        xyxy_tensor = box.xyxy.cpu()
        xyxy = xyxy_tensor.numpy().squeeze()
        xmin, ymin, xmax, ymax = xyxy.astype(int)
        xmin, ymin, xmax, ymax = safe_bbox_coords(xmin, ymin, xmax, ymax, w, h)

        if "chrysanthemum" in classname:
            chrysanthemums.append({
                "bbox": (xmin, ymin, xmax, ymax),
                "confidence": conf * 100.0
            })
        elif "mealybug" in classname:
            mealybugs.append({
                "bbox": (xmin, ymin, xmax, ymax),
                "confidence": conf * 100.0
            })

    # If no chrysanthemums found, return noObjects
    if not chrysanthemums:
        main_image_b64 = encode_frame_to_base64(frame, "main.jpg")["data"]
        return {
            "main_image_b64": main_image_b64,
            "plant_images_b64": [],
            "overall_status": "noObjects",
            "plant_statuses": [],
            "confidence": None
        }

    # Limit to 3 plants maximum
    chrysanthemums = chrysanthemums[:3]

    # Analyze each chrysanthemum for mealybug infection
    plant_statuses = []
    plant_images_b64 = []

    for idx, plant in enumerate(chrysanthemums, start=1):
        plant_bbox = plant["bbox"]
        plant_conf = plant["confidence"]

        # Check if any mealybug intersects with this plant (IoU > 0.3)
        is_diseased = False
        for mealybug in mealybugs:
            iou = calculate_iou(plant_bbox, mealybug["bbox"])
            if iou > 0.3:
                is_diseased = True
                break

        # Determine plant status
        plant_status = "diseased" if is_diseased else "healthy"
        plant_statuses.append({
            "order_num": idx,
            "status": plant_status,
            "confidence": round(plant_conf, 2)
        })

        # Create crop with 10% expansion
        xmin, ymin, xmax, ymax = plant_bbox
        bbox_w = xmax - xmin
        bbox_h = ymax - ymin
        expansion = 0.1

        crop_xmin = max(0, int(xmin - bbox_w * expansion))
        crop_ymin = max(0, int(ymin - bbox_h * expansion))
        crop_xmax = min(w, int(xmax + bbox_w * expansion))
        crop_ymax = min(h, int(ymax + bbox_h * expansion))

        crop = frame[crop_ymin:crop_ymax, crop_xmin:crop_xmax]
        crop_b64 = encode_frame_to_base64(crop, f"plant_{idx}.jpg")["data"]
        plant_images_b64.append(crop_b64)

    # Determine overall status
    statuses = [p["status"] for p in plant_statuses]
    if all(s == "healthy" for s in statuses):
        overall_status = "healthy"
    elif all(s == "diseased" for s in statuses):
        overall_status = "diseased"
    else:
        overall_status = "mixed"

    # Calculate average confidence
    avg_confidence = sum(p["confidence"] for p in plant_statuses) / len(plant_statuses)

    # Encode main image
    main_image_b64 = encode_frame_to_base64(frame, "main.jpg")["data"]

    return {
        "main_image_b64": main_image_b64,
        "plant_images_b64": plant_images_b64,
        "overall_status": overall_status,
        "plant_statuses": plant_statuses,
        "confidence": round(avg_confidence, 2)
    }


def encode_frame_to_base64(frame: np.ndarray, filename: str) -> Dict[str, str]:
    success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not success:
        raise RuntimeError("Не удалось закодировать кадр в JPEG.")
    return {
        "filename": filename,
        "content_type": "image/jpeg",
        "data": base64.b64encode(buffer.tobytes()).decode("ascii"),
    }


# -----------------------------
# Display & Save Helper Functions
# -----------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
STREAMSCAN_DIR = SCRIPT_DIR / "StreamScan"
STREAMFRAME_DIR = SCRIPT_DIR / "StreamFrame"
STREAMSCAN_DIR.mkdir(exist_ok=True)
STREAMFRAME_DIR.mkdir(exist_ok=True)

# Bounding box colors (10 colors for different classes)
BBOX_COLORS = [
    (164, 120, 87), (68, 148, 228), (93, 97, 209), (178, 182, 133), (88, 159, 106),
    (96, 202, 231), (159, 124, 168), (169, 162, 241), (98, 118, 150), (172, 176, 184)
]


def timestamp_str() -> str:
    """Generate timestamp string for filenames (millisecond precision)."""
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]


def safe_bbox_coords(xmin: int, ymin: int, xmax: int, ymax: int, w: int, h: int) -> Tuple[int, int, int, int]:
    """Ensure bounding box coordinates are within frame bounds."""
    xmin = max(0, int(xmin))
    ymin = max(0, int(ymin))
    xmax = min(int(xmax), w - 1)
    ymax = min(int(ymax), h - 1)
    return xmin, ymin, xmax, ymax


def draw_detections(frame: np.ndarray, boxes, labels_dict: Dict) -> int:
    """Draw bounding boxes and labels on frame. Returns object count."""
    if boxes is None or len(boxes) == 0:
        return 0

    object_count = 0
    h, w = frame.shape[:2]

    for box in boxes:
        conf = float(box.conf.item())
        if conf < CONF_THRESHOLD:
            continue

        # Get bounding box coordinates
        xyxy_tensor = box.xyxy.cpu()
        xyxy = xyxy_tensor.numpy().squeeze()
        xmin, ymin, xmax, ymax = xyxy.astype(int)
        xmin, ymin, xmax, ymax = safe_bbox_coords(xmin, ymin, xmax, ymax, w, h)

        # Get class info
        class_idx = int(box.cls.item())
        classname = labels_dict.get(class_idx, str(class_idx))

        # Draw rectangle with class-specific color
        color = BBOX_COLORS[class_idx % len(BBOX_COLORS)]
        cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)

        # Draw label background and text
        label = f"{classname}: {int(conf * 100)}%"
        label_size, base_line = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_ymin = max(ymin, label_size[1] + 10)
        cv2.rectangle(
            frame,
            (xmin, label_ymin - label_size[1] - 10),
            (xmin + label_size[0], label_ymin + base_line - 10),
            color,
            cv2.FILLED
        )
        cv2.putText(frame, label, (xmin, label_ymin - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        object_count += 1

    return object_count


def save_full_frame(frame: np.ndarray) -> None:
    """Save full frame to StreamScan/ directory."""
    fname = f"{timestamp_str()}.png"
    path = STREAMSCAN_DIR / fname
    cv2.imwrite(str(path), frame)
    logger.info(f"Saved full frame -> {path}")


def save_frames_from_detections(frame: np.ndarray, boxes, labels_dict: Dict) -> None:
    """Save crops for detections whose class name contains 'chrysanthemum' to StreamFrame/ directory."""
    if boxes is None or len(boxes) == 0:
        logger.info("No detections to save")
        return

    saved = 0
    h, w = frame.shape[:2]
    crops = []

    # Gather chrysanthemum detections
    for box in boxes:
        conf = float(box.conf.item())
        if conf < CONF_THRESHOLD:
            continue

        class_idx = int(box.cls.item())
        classname = labels_dict.get(class_idx, str(class_idx))

        if "chrysanthemum" in classname.lower():
            xyxy_tensor = box.xyxy.cpu()
            xyxy = xyxy_tensor.numpy().squeeze()
            xmin, ymin, xmax, ymax = xyxy.astype(int)
            xmin, ymin, xmax, ymax = safe_bbox_coords(xmin, ymin, xmax, ymax, w, h)
            crops.append((xmin, ymin, xmax, ymax, classname, conf))

    if not crops:
        logger.info("No chrysanthemum detections to save")
        return

    # Save crops with timestamp
    base_ts = timestamp_str()
    for idx, (xmin, ymin, xmax, ymax, classname, conf) in enumerate(crops, start=1):
        crop = frame[ymin:ymax, xmin:xmax]
        fname = f"{base_ts}"
        if len(crops) > 1:
            fname += f"-{idx}"
        fname += ".png"
        path = STREAMFRAME_DIR / fname
        cv2.imwrite(str(path), crop)
        saved += 1
        logger.info(f"Saved crop {saved} -> {path}")


@dataclass
class SharedState:
    latest_frame: Optional[np.ndarray] = None
    latest_timestamp: float = 0.0
    status: str = "noObjects"
    confidence: Optional[float] = None
    object_count: int = 0
    avg_fps: float = 0.0
    last_send_response: Optional[Dict[str, object]] = field(default=None)
    last_send_error: Optional[str] = field(default=None)
    supabase_last_response: Optional[Dict[str, object]] = field(default=None)
    supabase_last_error: Optional[str] = field(default=None)


class DetectionService:
    def __init__(self) -> None:
        if not Path(MODEL_PATH).exists():
            logger.warning(f"Модель '{MODEL_PATH}' не найдена — попробуем загрузить, но убедитесь в пути.")
        logger.info(f"Загрузка YOLO модели: {MODEL_PATH}")
        self.model = YOLO(MODEL_PATH, task="detect")
        self.labels = self.model.names
        logger.debug(f"Загружены классы: {self.labels}")

        self.pipeline = rs.pipeline()
        self.cfg = rs.config()
        self.cfg.enable_stream(rs.stream.color, FRAME_WIDTH, FRAME_HEIGHT, rs.format.bgr8, FRAME_RATE)
        self.align = rs.align(rs.stream.color)

        self.state = SharedState()
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.worker: Optional[threading.Thread] = None
        self.session = requests.Session()
        self.last_send_ts = 0.0
        self.supabase_writer = SupabaseDetectionWriter(session=self.session)
        if self.supabase_writer.is_enabled():
            flushed = list(self.supabase_writer.flush_pending())
            if flushed:
                logger.info(f"Supabase pending queue flushed ({len(flushed)} entries).")

    # -----------------------
    # Жизненный цикл
    # -----------------------
    def start(self) -> None:
        self._start_pipeline()
        self.worker = threading.Thread(target=self._loop, name="detection-loop", daemon=True)
        self.worker.start()

    def stop(self) -> None:
        self.stop_event.set()
        if self.worker and self.worker.is_alive():
            self.worker.join(timeout=5.0)
        try:
            self.pipeline.stop()
        except RuntimeError:
            pass
        if ENABLE_DISPLAY:
            cv2.destroyAllWindows()
            logger.debug("OpenCV windows destroyed")

    def _start_pipeline(self, max_retries: int = 5) -> None:
        """Start RealSense pipeline with auto-retry."""
        for attempt in range(max_retries):
            try:
                self.pipeline.start(self.cfg)
                logger.info(f"RealSense pipeline запущен {FRAME_WIDTH}x{FRAME_HEIGHT}@{FRAME_RATE}")
                return
            except Exception as exc:  # pylint: disable=broad-except
                logger.warning(f"Попытка {attempt+1}/{max_retries} запуска pipeline не удалась: {exc}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    logger.error("Не удалось запустить RealSense после нескольких попыток", exc_info=True)
                    raise SystemExit(f"Не удалось запустить RealSense pipeline: {exc}") from exc

    # -----------------------
    # Основной цикл
    # -----------------------
    def _loop(self) -> None:
        fps_value = FRAME_RATE
        smoothing = 0.9
        consecutive_errors = 0
        max_consecutive_errors = 10

        logger.info("Запуск основного цикла детекции")

        # Create OpenCV window if display is enabled
        if ENABLE_DISPLAY:
            cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_AUTOSIZE)
            logger.debug(f"OpenCV window '{WINDOW_NAME}' created")

        while not self.stop_event.is_set():
            try:
                frames = self.pipeline.wait_for_frames(timeout_ms=5000)
                aligned = self.align.process(frames)
                color_frame = aligned.get_color_frame()
                if not color_frame:
                    logger.warning("Нет цветового кадра")
                    consecutive_errors += 1
                    if consecutive_errors >= max_consecutive_errors:
                        logger.error(f"Слишком много ошибок получения кадра ({consecutive_errors}), переподключаем камеру...")
                        self._reconnect_camera()
                        consecutive_errors = 0
                    continue

                # Reset error counter on success
                consecutive_errors = 0

                frame = np.asanyarray(color_frame.get_data())
                inference_t0 = time.perf_counter()
                results = self.model(frame, verbose=False)
                boxes = results[0].boxes if results else None
                status, confidence, count = summarize_detections(boxes, self.labels)
                inference_dt = time.perf_counter() - inference_t0
                if inference_dt > 0:
                    fps_value = smoothing * fps_value + (1 - smoothing) * (1.0 / inference_dt)

                logger.debug(f"Frame processed: status={status}, conf={confidence}, count={count}, fps={fps_value:.2f}")

                # Create display frame with annotations (for OpenCV window and MJPEG streaming)
                display_frame = frame.copy()
                if boxes is not None and len(boxes) > 0:
                    visual_count = draw_detections(display_frame, boxes, self.labels)
                else:
                    visual_count = 0

                # Add FPS and object count overlay
                cv2.putText(display_frame, f"FPS: {fps_value:.2f}", (10, 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                cv2.putText(display_frame, f"Objects: {visual_count}", (10, 40),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

                # Update shared state with display frame (for streaming)
                with self.lock:
                    self.state.latest_frame = display_frame.copy()
                    self.state.latest_timestamp = time.time()
                    self.state.status = status
                    self.state.confidence = confidence
                    self.state.object_count = count
                    self.state.avg_fps = fps_value
                    self.state.last_send_error = None

                # Show in OpenCV window if enabled
                if ENABLE_DISPLAY:
                    cv2.imshow(WINDOW_NAME, display_frame)

                # Keyboard controls (only when display is enabled)
                if ENABLE_DISPLAY:
                    key = cv2.waitKey(5) & 0xFF

                    if key == ord('q') or key == ord('Q'):
                        logger.info("Quit key pressed - stopping service")
                        self.stop_event.set()
                        break

                    elif key == ord('p') or key == ord('P'):  # Pause
                        logger.info("Paused. Press P to resume or Q to quit")
                        while True:
                            k = cv2.waitKey(0) & 0xFF
                            if k == ord('p') or k == ord('P'):
                                logger.info("Resuming")
                                break
                            if k == ord('q') or k == ord('Q'):
                                logger.info("Quit while paused")
                                self.stop_event.set()
                                break
                        if self.stop_event.is_set():
                            break

                    elif key == ord('s') or key == ord('S'):  # Save full frame
                        save_full_frame(display_frame)

                    elif key == ord('f') or key == ord('F'):  # Save crops
                        save_frames_from_detections(frame, boxes, self.labels)

                # Send detection to cloud (use original frame, not annotated)
                if self._should_send():
                    if USER_TOKEN:
                        # Automatic sending enabled with user token
                        self._send_detection(frame.copy(), status, confidence, count, fps_value, user_token=USER_TOKEN)
                    else:
                        # Automatic sending disabled - user token required
                        logger.warning("Automatic detection sending skipped: RASPBERRY_PI_USER_TOKEN not set. Use Dashboard 'Detect' button for manual detection.")
                        self.last_send_ts = time.time()  # Update timestamp to avoid spamming warnings

            except RuntimeError as exc:
                consecutive_errors += 1
                logger.error(f"Ошибка получения кадра ({consecutive_errors}/{max_consecutive_errors}): {exc}")

                if consecutive_errors >= max_consecutive_errors:
                    logger.error("Слишком много ошибок подряд, переподключаем камеру...")
                    self._reconnect_camera()
                    consecutive_errors = 0

                time.sleep(1.0)

            except Exception as exc:  # pylint: disable=broad-except
                with self.lock:
                    self.state.last_send_error = str(exc)
                logger.error(f"Неожиданная ошибка в цикле детекции: {exc}", exc_info=True)
                time.sleep(1.0)

    def _reconnect_camera(self) -> None:
        """Reconnect RealSense camera after errors."""
        logger.info("Попытка переподключения камеры...")
        try:
            self.pipeline.stop()
            logger.debug("Pipeline остановлен")
        except RuntimeError as exc:
            logger.warning(f"Ошибка при остановке pipeline: {exc}")

        time.sleep(2)
        self._start_pipeline()
        logger.info("Камера успешно переподключена")

    # -----------------------
    # Отправка детекций
    # -----------------------
    def _should_send(self) -> bool:
        lovable_ready = bool(ENDPOINT and API_KEY and DEVICE_ID and SUPABASE_ANON_KEY)
        supabase_ready = self.supabase_writer.is_enabled()
        if not lovable_ready and not supabase_ready:
            return False
        if SEND_INTERVAL <= 0:
            return True
        return time.time() - self.last_send_ts >= SEND_INTERVAL

    def _send_detection(
        self,
        frame: np.ndarray,
        status: str,
        confidence: Optional[float],
        count: int,
        fps_value: float,
        user_token: Optional[str] = None,
    ) -> None:
        lovable_enabled = bool(ENDPOINT and API_KEY and DEVICE_ID and SUPABASE_ANON_KEY)
        supabase_enabled = self.supabase_writer.is_enabled()
        if not lovable_enabled and not supabase_enabled:
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        try:
            main_image = encode_frame_to_base64(frame, f"{timestamp}.jpg")
        except RuntimeError as exc:
            with self.lock:
                self.state.last_send_error = str(exc)
            logger.error(f"Не удалось подготовить кадр для отправки: {exc}")
            return

        main_image_data = main_image.get("data")
        payload = {
            "device_id": DEVICE_ID,
            "status": status,
            "confidence": round(confidence, 2) if confidence is not None else None,
            "main_image": main_image_data,
            "metadata": {
                "objectCount": count,
                "avgFps": round(fps_value, 2),
                "created_at": iso_now(),
            },
        }

        # Use user token if provided, otherwise use anon key
        auth_token = user_token if user_token else SUPABASE_ANON_KEY
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "apikey": SUPABASE_ANON_KEY,
            "X-Raspberry-Pi-Key": API_KEY,
            "Content-Type": "application/json",
        }

        # Debug logging для диагностики авторизации
        logger.debug(f"=== SEND DETECTION DEBUG INFO ===")
        logger.debug(f"DEVICE_ID: {DEVICE_ID}")
        logger.debug(f"ENDPOINT: {ENDPOINT}")
        logger.debug(f"API_KEY present: {API_KEY is not None}")
        if API_KEY:
            logger.debug(f"API_KEY (masked): {API_KEY[:8]}...{API_KEY[-8:]}")
        else:
            logger.warning("API_KEY is None! Check environment variables.")
        logger.debug(f"SUPABASE_ANON_KEY present: {SUPABASE_ANON_KEY is not None}")
        if SUPABASE_ANON_KEY:
            logger.debug(f"SUPABASE_ANON_KEY (first 20 chars): {SUPABASE_ANON_KEY[:20]}...")
        logger.debug(f"Headers keys: {list(headers.keys())}")
        logger.debug(f"=================================")

        lovable_response: Optional[Dict[str, object]] = None
        lovable_error: Optional[str] = None

        if lovable_enabled:
            try:
                response = self.session.post(ENDPOINT, headers=headers, json=payload, timeout=30)
                response.raise_for_status()
                lovable_response = (
                    response.json()
                    if "application/json" in response.headers.get("Content-Type", "")
                    else {"status_code": response.status_code}
                )
                logger.info(f"Детекция отправлена в Lovable Cloud ({status}, count={count}) -> {lovable_response}")
            except requests.RequestException as exc:
                lovable_error = str(exc)
                logger.error(f"Ошибка отправки детекции в Lovable Cloud: {exc}")

        if lovable_response is not None or lovable_error is not None:
            with self.lock:
                if lovable_response is not None:
                    self.state.last_send_response = lovable_response
                    self.state.last_send_error = None
                elif lovable_error is not None:
                    self.state.last_send_error = lovable_error

        self._send_supabase(payload, main_image, timestamp)
        self.last_send_ts = time.time()

    # -----------------------
    # Методы для HTTP
    # -----------------------
    def get_snapshot(self) -> Optional[bytes]:
        with self.lock:
            frame = None if self.state.latest_frame is None else self.state.latest_frame.copy()
        if frame is None:
            return None
        success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
        return buffer.tobytes() if success else None

    def get_latest_frame_copy(self) -> Optional[np.ndarray]:
        """Get a copy of the latest frame (for MJPEG streaming)."""
        with self.lock:
            return None if self.state.latest_frame is None else self.state.latest_frame.copy()

    def get_status(self) -> Dict[str, object]:
        with self.lock:
            return {
                "deviceId": DEVICE_ID,
                "status": self.state.status,
                "confidence": self.state.confidence,
                "objectCount": self.state.object_count,
                "avgFps": round(self.state.avg_fps, 2),
                "lastFrameTs": self.state.latest_timestamp,
                "lastSendResponse": self.state.last_send_response,
                "lastSendError": self.state.last_send_error,
                "supabaseLastResponse": self.state.supabase_last_response,
                "supabaseLastError": self.state.supabase_last_error,
                "sendInterval": SEND_INTERVAL,
                "endpoint": ENDPOINT,
            }

    def trigger_detection(self, user_token: Optional[str] = None) -> Dict[str, object]:
        """Manually trigger detection and send to cloud immediately."""
        with self.lock:
            # Get the original frame (without annotations) for fresh YOLO inference
            frame = None if self.state.latest_frame is None else self.state.latest_frame.copy()

        if frame is None:
            return {"success": False, "error": "no_frame_available"}

        try:
            # Run fresh YOLO inference on the frame
            results = self.model(frame, verbose=False)
            boxes = results[0].boxes if results else None

            # Use new analysis function to get crops and detailed statuses
            analysis = analyze_detection_with_crops(frame, boxes, self.labels)

            # Send detection with plant images and statuses
            self._send_detection_with_crops(analysis, user_token=user_token)

            return {
                "success": True,
                "status": analysis["overall_status"],
                "confidence": analysis["confidence"],
                "objectCount": len(analysis["plant_statuses"]),
                "timestamp": iso_now(),
            }
        except Exception as exc:
            logger.error(f"Error in trigger_detection: {exc}", exc_info=True)
            return {"success": False, "error": str(exc)}

    def _send_detection_with_crops(self, analysis: Dict[str, object], user_token: Optional[str] = None) -> None:
        """Send detection with plant crops and individual statuses to cloud."""
        lovable_enabled = bool(ENDPOINT and API_KEY and DEVICE_ID and SUPABASE_ANON_KEY)
        if not lovable_enabled:
            logger.warning("Cloud submission not enabled - missing credentials")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Prepare metadata with plant statuses
        metadata = {
            "objectCount": len(analysis["plant_statuses"]),
            "created_at": iso_now(),
            "plant_statuses": analysis["plant_statuses"]
        }

        payload = {
            "device_id": DEVICE_ID,
            "status": analysis["overall_status"],
            "confidence": analysis["confidence"],
            "main_image": analysis["main_image_b64"],
            "plant_images": analysis["plant_images_b64"],
            "metadata": metadata,
        }

        # Use user token if provided, otherwise use anon key
        auth_token = user_token if user_token else SUPABASE_ANON_KEY
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "apikey": SUPABASE_ANON_KEY,
            "X-Raspberry-Pi-Key": API_KEY,
            "Content-Type": "application/json",
        }

        try:
            response = self.session.post(ENDPOINT, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            lovable_response = (
                response.json()
                if "application/json" in response.headers.get("Content-Type", "")
                else {"status_code": response.status_code}
            )
            logger.info(f"Detection with crops sent successfully -> {lovable_response}")

            with self.lock:
                self.state.last_send_response = lovable_response
                self.state.last_send_error = None

        except requests.RequestException as exc:
            logger.error(f"Error sending detection with crops: {exc}")
            with self.lock:
                self.state.last_send_error = str(exc)

    def _send_supabase(self, payload: Dict[str, object], main_image: Dict[str, str], timestamp: str) -> None:
        if not self.supabase_writer.is_enabled():
            return
        metadata = dict(payload.get("metadata") or {})
        metadata.setdefault("objectCount", payload.get("metadata", {}).get("objectCount"))
        metadata.setdefault("avgFps", payload.get("metadata", {}).get("avgFps"))
        metadata.setdefault("captured_at", payload.get("metadata", {}).get("created_at"))
        metadata.setdefault("diseaseName", payload.get("status"))
        metadata = {k: v for k, v in metadata.items() if v is not None}
        supabase_payload = {
            "device_id": payload.get("device_id"),
            "status": payload.get("status"),
            "confidence": payload.get("confidence"),
            "metadata": metadata if metadata else None,
        }
        try:
            result = self.supabase_writer.send_detection(
                payload=supabase_payload,
                base64_image=main_image.get("data"),
                filename=f"{timestamp}.jpg",
            )
            with self.lock:
                self.state.supabase_last_response = result
                self.state.supabase_last_error = None
            logger.info("Supabase row записан успешно")
        except requests.RequestException as exc:
            with self.lock:
                self.state.supabase_last_error = str(exc)
            logger.warning(f"Supabase insert failed: {exc}")


# -----------------------------
# HTTP сервер
# -----------------------------
service = DetectionService()
app = Flask(__name__)

# CORS configuration for Lovable web app
ALLOWED_ORIGINS = [
    "https://6f57ff6c-8105-4412-aa58-20836cc6cf0a.lovableproject.com",
    "http://localhost:5173",  # Local development
    "http://localhost:3000",
]


@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses for web app access."""
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS or (origin and origin.startswith('https://') and 'lovableproject.com' in origin):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
    return response


@app.route("/snapshot")
def snapshot() -> Response:
    payload = service.get_snapshot()
    if payload is None:
        return jsonify({"error": "frame_not_ready"}), 503
    return Response(payload, mimetype="image/jpeg")


@app.route("/status")
def status():
    return jsonify(service.get_status())


@app.route("/detect", methods=["POST"])
def detect():
    """Trigger manual detection and send to cloud immediately."""
    # Get user token from Authorization header if present
    auth_header = request.headers.get("Authorization")
    user_token = None
    if auth_header and auth_header.startswith("Bearer "):
        user_token = auth_header.split(" ")[1]

    result = service.trigger_detection(user_token=user_token)
    if result.get("success"):
        return jsonify(result), 200
    else:
        return jsonify(result), 503


@app.route("/stream")
def stream():
    """MJPEG streaming endpoint for real-time video (for megtech.online subdomain)."""
    def generate():
        while True:
            frame = service.get_latest_frame_copy()
            if frame is None:
                time.sleep(0.1)
                continue

            success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
            if not success:
                time.sleep(0.1)
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )
            time.sleep(0.1)

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


def handle_signal(signum, frame):  # pylint: disable=unused-argument
    logger.info(f"Получен сигнал {signum}, останавливаем сервис...")
    service.stop()
    sys.exit(0)


def main() -> None:
    logger.info("=" * 60)
    logger.info("YOLO Detection Service - Starting")
    logger.info("=" * 60)
    logger.info(f"Device ID: {DEVICE_ID}")
    logger.info(f"Model: {MODEL_PATH}")
    logger.info(f"Camera: {FRAME_WIDTH}x{FRAME_HEIGHT}@{FRAME_RATE}")
    logger.info(f"Send Interval: {SEND_INTERVAL}s")
    logger.info(f"HTTP Server: {STREAM_HOST}:{STREAM_PORT}")
    logger.info("=" * 60)

    # Log automatic sending status
    if USER_TOKEN:
        logger.info("✓ Automatic detection sending: ENABLED")
        logger.info("  RASPBERRY_PI_USER_TOKEN is set")
        logger.info(f"  Detections will be sent every {SEND_INTERVAL}s")
    else:
        logger.info("✗ Automatic detection sending: DISABLED")
        logger.info("  RASPBERRY_PI_USER_TOKEN not set")
        logger.info("  Use Dashboard 'Detect' button for manual detection")

    logger.info("=" * 60)

    service.start()
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    logger.info(f"HTTP сервер запущен на {STREAM_HOST}:{STREAM_PORT}")
    logger.info("Endpoints: /snapshot, /status, /stream (MJPEG), /detect (POST)")
    if ENABLE_DISPLAY:
        logger.info(f"OpenCV display enabled - Window: '{WINDOW_NAME}'")
        logger.info("Keyboard controls: Q=Quit, P=Pause, S=Save full frame, F=Save crops")

    try:
        # Disable Flask logging to console (we use our own)
        flask_logger = logging.getLogger('werkzeug')
        flask_logger.setLevel(logging.WARNING)

        app.run(host=STREAM_HOST, port=STREAM_PORT, debug=False, use_reloader=False)
    finally:
        logger.info("Останавливаем сервис...")
        service.stop()
        logger.info("Сервис остановлен")


if __name__ == "__main__":
    main()
