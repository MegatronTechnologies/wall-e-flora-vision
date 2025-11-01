"""
Detection service for YOLO Detection Service.

Contains the main DetectionService class that handles camera pipeline,
YOLO inference, and cloud communication.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import cv2
import numpy as np
import requests
from ultralytics import YOLO

try:
    import pyrealsense2 as rs
except ImportError as exc:
    raise SystemExit(
        "pyrealsense2 (librealsense2) не найден. Установите пакет: pip install pyrealsense2"
    ) from exc

from config import (
    API_KEY,
    DEVICE_ID,
    ENABLE_AUTO_DETECTION,
    ENABLE_DISPLAY,
    ENDPOINT,
    FRAME_HEIGHT,
    FRAME_RATE,
    FRAME_WIDTH,
    JPEG_QUALITY_SNAPSHOT,
    JPEG_QUALITY_STREAM,
    MODEL_PATH,
    SEND_INTERVAL,
    SUPABASE_ANON_KEY,
    WINDOW_NAME,
)
from cleanup_utils import cleanup_on_startup
from detection_analyzer import analyze_detection_with_crops, summarize_detections
from image_processing import draw_detections
from supabase_client import SupabaseDetectionWriter
from utils import iso_now, logger


@dataclass
class SharedState:
    """Shared state between detection thread and Flask HTTP server."""

    latest_frame: Optional[np.ndarray] = None
    latest_jpeg_buffer: Optional[bytes] = None  # Pre-encoded JPEG for streaming
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
    """Main detection service for RealSense camera + YOLO inference."""

    def __init__(self) -> None:
        if not Path(MODEL_PATH).exists():
            logger.warning(
                f"Модель '{MODEL_PATH}' не найдена — попробуем загрузить, но убедитесь в пути."
            )
        logger.info(f"Загрузка YOLO модели: {MODEL_PATH}")
        self.model = YOLO(MODEL_PATH, task="detect")
        self.labels = self.model.names
        logger.debug(f"Загружены классы: {self.labels}")

        self.pipeline = rs.pipeline()
        self.cfg = rs.config()
        self.cfg.enable_stream(
            rs.stream.color, FRAME_WIDTH, FRAME_HEIGHT, rs.format.bgr8, FRAME_RATE
        )
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
                logger.info(
                    f"Supabase pending queue flushed ({len(flushed)} entries)."
                )

        # Run startup cleanup (logs rotation, pending cache cleanup)
        cleanup_on_startup()

    # -----------------------
    # Жизненный цикл
    # -----------------------
    def start(self) -> None:
        """Start the detection service."""
        self._start_pipeline()
        self.worker = threading.Thread(
            target=self._loop, name="detection-loop", daemon=True
        )
        self.worker.start()

    def stop(self) -> None:
        """Stop the detection service."""
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
                logger.info(
                    f"RealSense pipeline запущен {FRAME_WIDTH}x{FRAME_HEIGHT}@{FRAME_RATE}"
                )
                return
            except Exception as exc:  # pylint: disable=broad-except
                logger.warning(
                    f"Попытка {attempt+1}/{max_retries} запуска pipeline не удалась: {exc}"
                )
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    logger.error(
                        "Не удалось запустить RealSense после нескольких попыток",
                        exc_info=True,
                    )
                    raise SystemExit(
                        f"Не удалось запустить RealSense pipeline: {exc}"
                    ) from exc

    # -----------------------
    # Основной цикл
    # -----------------------
    def _loop(self) -> None:
        """Main detection loop."""
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
                        logger.error(
                            f"Слишком много ошибок получения кадра ({consecutive_errors}), переподключаем камеру..."
                        )
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
                    fps_value = smoothing * fps_value + (1 - smoothing) * (
                        1.0 / inference_dt
                    )

                logger.debug(
                    f"Frame processed: status={status}, conf={confidence}, count={count}, fps={fps_value:.2f}"
                )

                # Create display frame with annotations (for OpenCV window and MJPEG streaming)
                display_frame = frame.copy()
                if boxes is not None and len(boxes) > 0:
                    visual_count = draw_detections(display_frame, boxes, self.labels)
                else:
                    visual_count = 0

                # Add FPS and object count overlay
                cv2.putText(
                    display_frame,
                    f"FPS: {fps_value:.2f}",
                    (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 255),
                    2,
                )
                cv2.putText(
                    display_frame,
                    f"Objects: {visual_count}",
                    (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 255),
                    2,
                )

                # Pre-encode JPEG for streaming (encode once, reuse for all clients)
                success, jpeg_buffer = cv2.imencode(
                    ".jpg", display_frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY_STREAM]
                )
                jpeg_bytes = jpeg_buffer.tobytes() if success else None

                # Update shared state with display frame and cached JPEG (for streaming)
                with self.lock:
                    self.state.latest_frame = display_frame.copy()
                    self.state.latest_jpeg_buffer = jpeg_bytes
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
                    from image_processing import (
                        save_frames_from_detections,
                        save_full_frame,
                    )

                    key = cv2.waitKey(5) & 0xFF

                    if key == ord("q") or key == ord("Q"):
                        logger.info("Quit key pressed - stopping service")
                        self.stop_event.set()
                        break

                    elif key == ord("p") or key == ord("P"):  # Pause
                        logger.info("Paused. Press P to resume or Q to quit")
                        while True:
                            k = cv2.waitKey(0) & 0xFF
                            if k == ord("p") or k == ord("P"):
                                logger.info("Resuming")
                                break
                            if k == ord("q") or k == ord("Q"):
                                logger.info("Quit while paused")
                                self.stop_event.set()
                                break
                        if self.stop_event.is_set():
                            break

                    elif key == ord("s") or key == ord("S"):  # Save full frame
                        save_full_frame(display_frame)

                    elif key == ord("f") or key == ord("F"):  # Save crops
                        save_frames_from_detections(frame, boxes, self.labels)

                # Automatic detection sending (controlled by RS_ENABLE_AUTO_DETECTION env var)
                if ENABLE_AUTO_DETECTION and self._should_send():
                    self._send_detection(frame.copy(), status, confidence, count, fps_value)

            except RuntimeError as exc:
                consecutive_errors += 1
                logger.error(
                    f"Ошибка получения кадра ({consecutive_errors}/{max_consecutive_errors}): {exc}"
                )

                if consecutive_errors >= max_consecutive_errors:
                    logger.error(
                        "Слишком много ошибок подряд, переподключаем камеру..."
                    )
                    self._reconnect_camera()
                    consecutive_errors = 0

                time.sleep(1.0)

            except Exception as exc:  # pylint: disable=broad-except
                with self.lock:
                    self.state.last_send_error = str(exc)
                logger.error(
                    f"Неожиданная ошибка в цикле детекции: {exc}", exc_info=True
                )
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
        """Check if enough time has passed to send next detection."""
        lovable_ready = bool(
            ENDPOINT and API_KEY and DEVICE_ID and SUPABASE_ANON_KEY
        )
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
    ) -> None:
        """Send detection to cloud (automatic sending - currently disabled)."""
        from image_processing import encode_frame_to_base64

        lovable_enabled = bool(
            ENDPOINT and API_KEY and DEVICE_ID and SUPABASE_ANON_KEY
        )
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

        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "X-Raspberry-Pi-Key": API_KEY,
            "Content-Type": "application/json",
        }

        # Debug logging для диагностики авторизации
        logger.debug("=== SEND DETECTION DEBUG INFO ===")
        logger.debug(f"DEVICE_ID: {DEVICE_ID}")
        logger.debug(f"ENDPOINT: {ENDPOINT}")
        if API_KEY:
            logger.debug("API_KEY present: True")
        else:
            logger.warning("API_KEY is None! Check environment variables.")
        logger.debug(f"SUPABASE_ANON_KEY present: {SUPABASE_ANON_KEY is not None}")
        if SUPABASE_ANON_KEY:
            logger.debug(
                f"SUPABASE_ANON_KEY (first 20 chars): {SUPABASE_ANON_KEY[:20]}..."
            )
        logger.debug(f"Headers keys: {list(headers.keys())}")
        logger.debug("=================================")

        lovable_response: Optional[Dict[str, object]] = None
        lovable_error: Optional[str] = None

        if lovable_enabled:
            try:
                response = self.session.post(
                    ENDPOINT, headers=headers, json=payload, timeout=30
                )
                response.raise_for_status()
                lovable_response = (
                    response.json()
                    if "application/json" in response.headers.get("Content-Type", "")
                    else {"status_code": response.status_code}
                )
                logger.info(
                    f"Детекция отправлена в Lovable Cloud ({status}, count={count}) -> {lovable_response}"
                )
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
        """Get latest frame as JPEG bytes for /snapshot endpoint."""
        with self.lock:
            frame = (
                None if self.state.latest_frame is None else self.state.latest_frame.copy()
            )
        if frame is None:
            return None
        success, buffer = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY_SNAPSHOT]
        )
        return buffer.tobytes() if success else None

    def get_latest_frame_copy(self) -> Optional[np.ndarray]:
        """Get a copy of the latest frame (for MJPEG streaming).

        DEPRECATED: Use get_cached_jpeg_stream() instead for better performance.
        """
        with self.lock:
            return (
                None if self.state.latest_frame is None else self.state.latest_frame.copy()
            )

    def get_cached_jpeg_stream(self) -> Optional[bytes]:
        """Get pre-encoded JPEG buffer for streaming (optimized - no encoding overhead)."""
        with self.lock:
            return self.state.latest_jpeg_buffer

    def get_status(self) -> Dict[str, object]:
        """Get current detection status for /status endpoint."""
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
            frame = (
                None if self.state.latest_frame is None else self.state.latest_frame.copy()
            )

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

    def _send_detection_with_crops(
        self, analysis: Dict[str, object], user_token: Optional[str] = None
    ) -> None:
        """Send detection with plant crops and individual statuses to cloud."""
        lovable_enabled = bool(
            ENDPOINT and API_KEY and DEVICE_ID and SUPABASE_ANON_KEY
        )
        if not lovable_enabled:
            logger.warning("Cloud submission not enabled - missing credentials")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Prepare metadata with plant statuses
        metadata = {
            "objectCount": len(analysis["plant_statuses"]),
            "created_at": iso_now(),
            "plant_statuses": analysis["plant_statuses"],
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
            response = self.session.post(
                ENDPOINT, headers=headers, json=payload, timeout=30
            )
            response.raise_for_status()
            lovable_response = (
                response.json()
                if "application/json" in response.headers.get("Content-Type", "")
                else {"status_code": response.status_code}
            )
            logger.info(
                f"Detection with crops sent successfully -> {lovable_response}"
            )

            with self.lock:
                self.state.last_send_response = lovable_response
                self.state.last_send_error = None

        except requests.RequestException as exc:
            logger.error(f"Error sending detection with crops: {exc}")
            with self.lock:
                self.state.last_send_error = str(exc)

    def _send_supabase(
        self, payload: Dict[str, object], main_image: Dict[str, str], timestamp: str
    ) -> None:
        """Send detection directly to Supabase (if configured)."""
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
