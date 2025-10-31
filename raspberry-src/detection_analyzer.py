"""
Detection analysis functions for YOLO Detection Service.

Contains functions for analyzing YOLO detections and determining plant health status.
"""
from typing import Dict, Optional, Tuple

import numpy as np

from config import CONF_THRESHOLD
from image_processing import encode_frame_to_base64
from utils import safe_bbox_coords


def summarize_detections(boxes, labels) -> Tuple[str, Optional[float], int]:
    """
    Summarize detection results into status, confidence, and object count.

    Returns:
        (status, confidence, count)
        status: "noObjects" | "healthy" | "diseased" | "mixed"
    """
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


def analyze_detection_with_crops(
    frame: np.ndarray, boxes, labels_dict: Dict
) -> Dict[str, object]:
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
            "confidence": None,
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
            chrysanthemums.append(
                {"bbox": (xmin, ymin, xmax, ymax), "confidence": conf * 100.0}
            )
        elif "mealybug" in classname:
            mealybugs.append(
                {"bbox": (xmin, ymin, xmax, ymax), "confidence": conf * 100.0}
            )

    # If no chrysanthemums found, return noObjects
    if not chrysanthemums:
        main_image_b64 = encode_frame_to_base64(frame, "main.jpg")["data"]
        return {
            "main_image_b64": main_image_b64,
            "plant_images_b64": [],
            "overall_status": "noObjects",
            "plant_statuses": [],
            "confidence": None,
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
        plant_statuses.append(
            {
                "order_num": idx,
                "status": plant_status,
                "confidence": round(plant_conf, 2),
            }
        )

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
    avg_confidence = sum(p["confidence"] for p in plant_statuses) / len(
        plant_statuses
    )

    # Encode main image
    main_image_b64 = encode_frame_to_base64(frame, "main.jpg")["data"]

    return {
        "main_image_b64": main_image_b64,
        "plant_images_b64": plant_images_b64,
        "overall_status": overall_status,
        "plant_statuses": plant_statuses,
        "confidence": round(avg_confidence, 2),
    }
