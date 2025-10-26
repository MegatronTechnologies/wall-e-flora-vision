#!/usr/bin/env python3
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from threading import Lock, Thread
from typing import Optional

import cv2
import numpy as np
from ultralytics import YOLO

try:
    from flask import Flask, Response, jsonify
except ImportError as exc:
    raise SystemExit("Flask is required for HTTP streaming. Install it: pip install flask") from exc

# Note: requires pyrealsense2 (librealsense2 Python wrapper)
try:
    import pyrealsense2 as rs
except Exception as e:
    print("ERROR: pyrealsense2 (librealsense2) is required to use Intel RealSense. Install it first.")
    raise

# ---------------------------
# Logging Setup
# ---------------------------
def setup_logging() -> logging.Logger:
    """Setup structured logging with file output (overwrites on each run)."""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "old-yolo.log"

    # Remove old log file on startup
    if log_file.exists():
        log_file.unlink()

    logger = logging.getLogger("old_yolo")
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

# ---------------------------
# CONFIGURATION (defaults)
# ---------------------------
MODEL_PATH = "best_ncnn_model"        # default model path (change if needed)
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
CONF_THRESHOLD = 0.5                  # confidence threshold for drawing/saving
WINDOW_NAME = "YOLO detection results"
STREAM_HOST = os.getenv("OLD_YOLO_STREAM_HOST", "0.0.0.0")
STREAM_PORT = int(os.getenv("OLD_YOLO_STREAM_PORT", "8080"))
ENABLE_DISPLAY = os.getenv("OLD_YOLO_DISPLAY", "0").lower() in {"1", "true", "yes"}
JPEG_QUALITY = int(os.getenv("OLD_YOLO_JPEG_QUALITY", "85"))

# Folders for saving
SCRIPT_DIR = Path(__file__).resolve().parent
STREAMSCAN_DIR = SCRIPT_DIR / "StreamScan"
STREAMFRAME_DIR = SCRIPT_DIR / "StreamFrame"
STREAMSCAN_DIR.mkdir(exist_ok=True)
STREAMFRAME_DIR.mkdir(exist_ok=True)

app = Flask(__name__)

frame_lock = Lock()
latest_frame: Optional[np.ndarray] = None
last_frame_iso: Optional[str] = None
last_object_count = 0
avg_frame_rate = 0.0

# ---------------------------
# Load YOLO model
# ---------------------------
if not os.path.exists(MODEL_PATH):
    logger.warning(f"Model path '{MODEL_PATH}' does not exist. YOLO will try to load it anyway (may fail).")
logger.info(f"Загрузка YOLO модели: {MODEL_PATH}")
model = YOLO(MODEL_PATH, task="detect")
labels = model.names  # dict: id->name
logger.debug(f"Загружены классы: {labels}")

# ---------------------------
# Setup RealSense pipeline (color only)
# ---------------------------
pipeline = rs.pipeline()
cfg = rs.config()
cfg.enable_stream(rs.stream.color, FRAME_WIDTH, FRAME_HEIGHT, rs.format.bgr8, 30)

# Try to start pipeline with retry
consecutive_pipeline_errors = 0
MAX_PIPELINE_RETRIES = 5

def start_pipeline_with_retry():
    global consecutive_pipeline_errors
    for attempt in range(MAX_PIPELINE_RETRIES):
        try:
            profile = pipeline.start(cfg)
            logger.info(f"RealSense pipeline запущен {FRAME_WIDTH}x{FRAME_HEIGHT}@30fps")
            consecutive_pipeline_errors = 0
            return profile
        except Exception as e:
            logger.warning(f"Попытка {attempt+1}/{MAX_PIPELINE_RETRIES} запуска pipeline не удалась: {e}")
            if attempt < MAX_PIPELINE_RETRIES - 1:
                time.sleep(2)
            else:
                logger.error("Failed to start RealSense pipeline after retries", exc_info=True)
                sys.exit(1)

profile = start_pipeline_with_retry()

align_to = rs.stream.color
align = rs.align(align_to)

# ---------------------------
# Utility functions
# ---------------------------
def timestamp_str():
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # ms precision

def safe_bbox_coords(xmin, ymin, xmax, ymax, w, h):
    xmin = max(0, int(xmin))
    ymin = max(0, int(ymin))
    xmax = min(int(xmax), w - 1)
    ymax = min(int(ymax), h - 1)
    return xmin, ymin, xmax, ymax

def save_full_frame(frame):
    fname = f"{timestamp_str()}.png"
    path = STREAMSCAN_DIR / fname
    cv2.imwrite(str(path), frame)
    logger.info(f"Saved full frame -> {path}")

def save_frames_from_detections(frame, detections, labels_dict):
    """Save crops for detections whose class name contains 'chrysanthemum' (case-insensitive)."""
    saved = 0
    h, w = frame.shape[:2]
    # gather relevant detections
    crops = []
    for i in range(len(detections)):
        conf = float(detections[i].conf.item())
        if conf < CONF_THRESHOLD:
            continue
        classidx = int(detections[i].cls.item())
        classname = labels_dict.get(classidx, str(classidx))
        if "chrysanthemum" in classname.lower():
            xyxy_tensor = detections[i].xyxy.cpu()
            xyxy = xyxy_tensor.numpy().squeeze()
            xmin, ymin, xmax, ymax = xyxy.astype(int)
            xmin, ymin, xmax, ymax = safe_bbox_coords(xmin, ymin, xmax, ymax, w, h)
            crops.append((xmin, ymin, xmax, ymax, classname, conf))

    if not crops:
        logger.info("No chrysanthemum detections to save")
        return

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

# ---------------------------
# HTTP streaming helpers
# ---------------------------
def _copy_latest_frame() -> Optional[np.ndarray]:
    with frame_lock:
        if latest_frame is None:
            return None
        return latest_frame.copy()


def mjpeg_stream():
    while True:
        frame = _copy_latest_frame()
        if frame is None:
            time.sleep(0.1)
            continue
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
        if not ok:
            time.sleep(0.1)
            continue
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
        )
        time.sleep(0.1)


@app.route("/stream")
def stream():
    return Response(mjpeg_stream(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/")
def index():
    return Response(
        """
        <html>
            <head><title>Old YOLO Stream</title></head>
            <body>
                <h1>Old YOLO Stream</h1>
                <ul>
                    <li><a href="/stream">/stream</a> – MJPEG canlı yayım</li>
                    <li><a href="/snapshot">/snapshot</a> – son kadr (JPEG)</li>
                    <li><a href="/status">/status</a> – JSON status</li>
                </ul>
            </body>
        </html>
        """,
        mimetype="text/html",
    )


@app.route("/snapshot")
def snapshot():
    frame = _copy_latest_frame()
    if frame is None:
        return Response("No frame available", status=503)
    ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        return Response("Failed to encode frame", status=500)
    return Response(buffer.tobytes(), mimetype="image/jpeg")


@app.route("/status")
def status():
    with frame_lock:
        payload = {
            "last_frame_iso": last_frame_iso,
            "object_count": last_object_count,
            "avg_fps": avg_frame_rate,
        }
    return jsonify(payload)


def start_http_server() -> Thread:
    def _run():
        app.run(host=STREAM_HOST, port=STREAM_PORT, threaded=True, use_reloader=False)

    thread = Thread(target=_run, daemon=True)
    thread.start()
    return thread


# ---------------------------
# Drawing helpers
# ---------------------------
bbox_colors = [(164,120,87), (68,148,228), (93,97,209), (178,182,133), (88,159,106),
               (96,202,231), (159,124,168), (169,162,241), (98,118,150), (172,176,184)]

def draw_detections(frame, detections, labels_dict):
    object_count = 0
    h, w = frame.shape[:2]
    for i in range(len(detections)):
        conf = float(detections[i].conf.item())
        if conf < CONF_THRESHOLD:
            continue
        xyxy_tensor = detections[i].xyxy.cpu()
        xyxy = xyxy_tensor.numpy().squeeze()
        xmin, ymin, xmax, ymax = xyxy.astype(int)
        xmin, ymin, xmax, ymax = safe_bbox_coords(xmin, ymin, xmax, ymax, w, h)

        classidx = int(detections[i].cls.item())
        classname = labels_dict.get(classidx, str(classidx))

        color = bbox_colors[classidx % len(bbox_colors)]
        cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)

        label = f"{classname}: {int(conf * 100)}%"
        labelSize, baseLine = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_ymin = max(ymin, labelSize[1] + 10)
        cv2.rectangle(frame, (xmin, label_ymin - labelSize[1] - 10), (xmin + labelSize[0], label_ymin + baseLine - 10), color, cv2.FILLED)
        cv2.putText(frame, label, (xmin, label_ymin - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        object_count += 1
    return object_count

# ---------------------------
# Main loop
# ---------------------------
frame_count = 0
fps_buffer = []
fps_avg_len = 200
avg_frame_rate = 0.0

logger.info("=" * 60)
logger.info("Old YOLO Detection Service - Starting")
logger.info("=" * 60)
logger.info("Starting main loop. Press Q to quit, P to pause, S to save full frame, F to save crops (chrysanthemum).")

http_thread = start_http_server()
visible_host = "127.0.0.1" if STREAM_HOST == "0.0.0.0" else STREAM_HOST
logger.info(f"HTTP Server запущен на {STREAM_HOST}:{STREAM_PORT}")
logger.info(f"[HTTP] MJPEG stream:\thttp://{visible_host}:{STREAM_PORT}/stream")
logger.info(f"[HTTP] Snapshot:\thttp://{visible_host}:{STREAM_PORT}/snapshot")
logger.info(f"[HTTP] Status:\thttp://{visible_host}:{STREAM_PORT}/status")
logger.info(f"Display mode: {'enabled' if ENABLE_DISPLAY else 'disabled'}")

try:
    if ENABLE_DISPLAY:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_AUTOSIZE)

    consecutive_frame_errors = 0
    MAX_FRAME_ERRORS = 10

    while True:
        try:
            t0 = time.perf_counter()
            # Wait for a coherent pair of frames: depth not used but aligning to color
            frames = pipeline.wait_for_frames(timeout_ms=5000)
            aligned = align.process(frames)
            color_frame = aligned.get_color_frame()
            if not color_frame:
                logger.warning("No color frame received")
                consecutive_frame_errors += 1
                if consecutive_frame_errors >= MAX_FRAME_ERRORS:
                    logger.error(f"Too many frame errors ({consecutive_frame_errors}), reconnecting camera...")
                    try:
                        pipeline.stop()
                        time.sleep(2)
                        profile = start_pipeline_with_retry()
                        consecutive_frame_errors = 0
                    except Exception as e:
                        logger.error(f"Failed to reconnect: {e}", exc_info=True)
                        break
                continue

            # Reset error counter on success
            consecutive_frame_errors = 0

            color_image = np.asanyarray(color_frame.get_data())  # this is BGR8 already
            frame = color_image  # alias

            # Run YOLO inference (Ultralytics accepts numpy images)
            results = model(frame, verbose=False)
            detections = results[0].boxes

            # Draw detections and overlay info
            object_count = draw_detections(frame, detections, labels)
            cv2.putText(frame, f"Number of objects: {object_count}", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, .7, (0, 255, 255), 2)

            # FPS calc
            t1 = time.perf_counter()
            frame_rate_calc = 1.0 / (t1 - t0) if (t1 - t0) > 0 else 0.0
            fps_buffer.append(frame_rate_calc)
            if len(fps_buffer) > fps_avg_len:
                fps_buffer.pop(0)
            computed_avg_fps = float(sum(fps_buffer)) / len(fps_buffer)
            cv2.putText(frame, f"FPS: {computed_avg_fps:0.2f}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, .7, (0,255,255), 2)

            logger.debug(f"Frame {frame_count}: objects={object_count}, fps={computed_avg_fps:.2f}")

            with frame_lock:
                latest_frame = frame.copy()
                last_frame_iso = datetime.now().isoformat(timespec="seconds")
                last_object_count = object_count
                avg_frame_rate = computed_avg_fps

            if ENABLE_DISPLAY:
                cv2.imshow(WINDOW_NAME, frame)

            frame_count += 1

            key = cv2.waitKey(5) & 0xFF if ENABLE_DISPLAY else -1

            if key == ord('q') or key == ord('Q'):
                logger.info("Quit key pressed")
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
                        raise KeyboardInterrupt

            elif key == ord('s') or key == ord('S'):  # Save full frame -> StreamScan
                save_full_frame(frame)

            elif key == ord('f') or key == ord('F'):  # Save crops -> StreamFrame
                save_frames_from_detections(frame, detections, labels)

        except RuntimeError as e:
            consecutive_frame_errors += 1
            logger.error(f"Frame error ({consecutive_frame_errors}/{MAX_FRAME_ERRORS}): {e}")
            if consecutive_frame_errors >= MAX_FRAME_ERRORS:
                logger.error("Too many consecutive errors, reconnecting...")
                try:
                    pipeline.stop()
                    time.sleep(2)
                    profile = start_pipeline_with_retry()
                    consecutive_frame_errors = 0
                except Exception as ex:
                    logger.error(f"Failed to reconnect: {ex}", exc_info=True)
                    break
            time.sleep(0.5)

except KeyboardInterrupt:
    logger.info("Interrupted by user")
finally:
    # Cleanup
    logger.info("Shutting down...")
    try:
        pipeline.stop()
        logger.debug("Pipeline stopped")
    except Exception as e:
        logger.warning(f"Error stopping pipeline: {e}")

    if ENABLE_DISPLAY:
        cv2.destroyAllWindows()
        logger.debug("Windows destroyed")

    if fps_buffer:
        logger.info(f"Average pipeline FPS: {avg_frame_rate:.2f}")
        logger.info(f"Total frames processed: {frame_count}")
    else:
        logger.warning("No frames processed")

    logger.info("=" * 60)
    logger.info("Old YOLO Detection Service - Stopped")
    logger.info("=" * 60)
