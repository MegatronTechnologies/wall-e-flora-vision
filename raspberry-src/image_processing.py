"""
Image processing functions for YOLO Detection Service.

Contains functions for encoding, drawing, and saving images.
"""
import base64
from typing import Dict

import cv2
import numpy as np

from config import BBOX_COLORS, CONF_THRESHOLD, JPEG_QUALITY, STREAMSCAN_DIR, STREAMFRAME_DIR
from utils import logger, safe_bbox_coords, timestamp_str


def encode_frame_to_base64(frame: np.ndarray, filename: str) -> Dict[str, str]:
    """Encode frame to base64 JPEG string."""
    success, buffer = cv2.imencode(
        ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    )
    if not success:
        raise RuntimeError("Не удалось закодировать кадр в JPEG.")
    return {
        "filename": filename,
        "content_type": "image/jpeg",
        "data": base64.b64encode(buffer.tobytes()).decode("ascii"),
    }


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
        label_size, base_line = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
        )
        label_ymin = max(ymin, label_size[1] + 10)
        cv2.rectangle(
            frame,
            (xmin, label_ymin - label_size[1] - 10),
            (xmin + label_size[0], label_ymin + base_line - 10),
            color,
            cv2.FILLED,
        )
        cv2.putText(
            frame,
            label,
            (xmin, label_ymin - 7),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 0),
            1,
        )
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
