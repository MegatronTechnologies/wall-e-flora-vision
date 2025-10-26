#!/usr/bin/env python3
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

# Note: requires pyrealsense2 (librealsense2 Python wrapper)
try:
    import pyrealsense2 as rs
except Exception as e:
    print("ERROR: pyrealsense2 (librealsense2) is required to use Intel RealSense. Install it first.")
    raise

# ---------------------------
# CONFIGURATION (defaults)
# ---------------------------
MODEL_PATH = "best_ncnn_model"        # default model path (change if needed)
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
CONF_THRESHOLD = 0.5                  # confidence threshold for drawing/saving
WINDOW_NAME = "YOLO detection results"

# Folders for saving
SCRIPT_DIR = Path(__file__).resolve().parent
STREAMSCAN_DIR = SCRIPT_DIR / "StreamScan"
STREAMFRAME_DIR = SCRIPT_DIR / "StreamFrame"
STREAMSCAN_DIR.mkdir(exist_ok=True)
STREAMFRAME_DIR.mkdir(exist_ok=True)

# ---------------------------
# Load YOLO model
# ---------------------------
if not os.path.exists(MODEL_PATH):
    print(f"WARNING: Model path '{MODEL_PATH}' does not exist. YOLO will try to load it anyway (may fail).")
model = YOLO(MODEL_PATH, task="detect")
labels = model.names  # dict: id->name

# ---------------------------
# Setup RealSense pipeline (color only)
# ---------------------------
pipeline = rs.pipeline()
cfg = rs.config()
cfg.enable_stream(rs.stream.color, FRAME_WIDTH, FRAME_HEIGHT, rs.format.bgr8, 30)

# Try to start pipeline
try:
    profile = pipeline.start(cfg)
except Exception as e:
    print("ERROR: Failed to start RealSense pipeline:", e)
    sys.exit(1)

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
    print(f"Saved full frame -> {path}")

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
        print("No chrysanthemum detections to save.")
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
        print(f"Saved crop {saved} -> {path}")

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
cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_AUTOSIZE)
frame_count = 0
fps_buffer = []
fps_avg_len = 200
avg_frame_rate = 0.0

print("Starting main loop. Press Q to quit, P to pause, S to save full frame, F to save crops (chrysanthemum).")

try:
    while True:
        t0 = time.perf_counter()
        # Wait for a coherent pair of frames: depth not used but aligning to color
        frames = pipeline.wait_for_frames(timeout_ms=5000)
        aligned = align.process(frames)
        color_frame = aligned.get_color_frame()
        if not color_frame:
            print("Warning: no color frame received")
            continue

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
        avg_frame_rate = float(sum(fps_buffer)) / len(fps_buffer)
        cv2.putText(frame, f"FPS: {avg_frame_rate:0.2f}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, .7, (0,255,255), 2)

        # Show frame
        cv2.imshow(WINDOW_NAME, frame)
        frame_count += 1

        key = cv2.waitKey(5) & 0xFF

        if key == ord('q') or key == ord('Q'):
            print("Quit key pressed.")
            break

        elif key == ord('p') or key == ord('P'):  # Pause
            print("Paused. Press P to resume or Q to quit.")
            while True:
                k = cv2.waitKey(0) & 0xFF
                if k == ord('p') or k == ord('P'):
                    print("Resuming.")
                    break
                if k == ord('q') or k == ord('Q'):
                    print("Quit while paused.")
                    raise KeyboardInterrupt

        elif key == ord('s') or key == ord('S'):  # Save full frame -> StreamScan
            save_full_frame(frame)

        elif key == ord('f') or key == ord('F'):  # Save crops -> StreamFrame
            save_frames_from_detections(frame, detections, labels)

except KeyboardInterrupt:
    print("Interrupted by user.")
finally:
    # Cleanup
    pipeline.stop()
    cv2.destroyAllWindows()
    if fps_buffer:
        print(f"Average pipeline FPS: {avg_frame_rate:.2f}")
    else:
        print("No frames processed.")
