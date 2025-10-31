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

import logging
import signal
import sys

from config import (
    DEVICE_ID,
    ENABLE_DISPLAY,
    FRAME_HEIGHT,
    FRAME_RATE,
    FRAME_WIDTH,
    MODEL_PATH,
    STREAM_HOST,
    STREAM_PORT,
    WINDOW_NAME,
)
from flask_app import app, get_service
from utils import logger


def handle_signal(signum, frame):  # pylint: disable=unused-argument
    """Handle termination signals."""
    logger.info(f"Получен сигнал {signum}, останавливаем сервис...")
    service = get_service()
    service.stop()
    sys.exit(0)


def main() -> None:
    """Main entry point for YOLO Detection Service."""
    logger.info("=" * 60)
    logger.info("YOLO Detection Service - Starting")
    logger.info("=" * 60)
    logger.info(f"Device ID: {DEVICE_ID}")
    logger.info(f"Model: {MODEL_PATH}")
    logger.info(f"Camera: {FRAME_WIDTH}x{FRAME_HEIGHT}@{FRAME_RATE}")
    logger.info(f"HTTP Server: {STREAM_HOST}:{STREAM_PORT}")
    logger.info("=" * 60)
    logger.info("⚠️  Automatic detection sending: DISABLED")
    logger.info("   Use Dashboard 'Detect' button for manual detection")
    logger.info("=" * 60)

    # Get service instance from flask_app
    service = get_service()
    service.start()

    # Setup signal handlers
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    logger.info(f"HTTP сервер запущен на {STREAM_HOST}:{STREAM_PORT}")
    logger.info("Endpoints: /snapshot, /status, /stream (MJPEG), /detect (POST)")
    if ENABLE_DISPLAY:
        logger.info(f"OpenCV display enabled - Window: '{WINDOW_NAME}'")
        logger.info(
            "Keyboard controls: Q=Quit, P=Pause, S=Save full frame, F=Save crops"
        )

    try:
        # Disable Flask logging to console (we use our own)
        flask_logger = logging.getLogger("werkzeug")
        flask_logger.setLevel(logging.WARNING)

        app.run(
            host=STREAM_HOST, port=STREAM_PORT, debug=False, use_reloader=False
        )
    finally:
        logger.info("Останавливаем сервис...")
        service.stop()
        logger.info("Сервис остановлен")


if __name__ == "__main__":
    main()
