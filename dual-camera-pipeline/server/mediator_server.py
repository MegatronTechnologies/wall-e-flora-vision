#!/usr/bin/env python3
"""Dual-camera mediator server.

Flow:
  RealSense publisher  -> /ingest/realsense
  RPi Cam3 publisher   -> /ingest/rpi-cam3
  Dashboard Detect     -> /detect
  Dashboard streams    -> /camera/<camera>/stream

The mediator runs YOLO centrally and forwards a merged detection payload to
Supabase submit-detection so the existing dashboard cards keep working.
"""
from __future__ import annotations

import base64
import os
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import requests
from flask import Flask, Response, jsonify, request
from ultralytics import YOLO

CAM_REALSENSE = "realsense"
CAM_RPI_CAM3 = "rpi-cam3"
SUPPORTED_CAMERAS = {CAM_REALSENSE, CAM_RPI_CAM3}

FLOWER_CLASSES = {"ficus_elastica", "kalanchoe", "pelargonium"}
DISEASE_CLASSES = {"mealybug_infestation", "black_spot", "plant_rust"}

def _discover_model(kind: str) -> str:
    desktop = Path(os.getenv("MODEL_SEARCH_DIR", "/home/megtech/Desktop"))
    if desktop.exists():
        candidates = sorted(desktop.glob("*.pt"))
        if kind == "flower":
            preferred = [p for p in candidates if "flower" in p.name.lower() or "plant" in p.name.lower()]
        else:
            preferred = [p for p in candidates if "disease" in p.name.lower() or "rust" in p.name.lower() or "spot" in p.name.lower() or "mealybug" in p.name.lower()]
        if preferred:
            return str(preferred[0])
    return "best.pt"


FLOWER_MODEL_PATH = os.getenv("FLOWER_MODEL_PATH", _discover_model("flower"))
DISEASE_MODEL_PATH = os.getenv("DISEASE_MODEL_PATH", _discover_model("disease"))
CONF_THRESHOLD = float(os.getenv("YOLO_CONF_THRESHOLD", "0.30"))

MEDIATOR_HOST = os.getenv("MEDIATOR_HOST", "0.0.0.0")
MEDIATOR_PORT = int(os.getenv("MEDIATOR_PORT", "8090"))

SUBMIT_ENDPOINT = os.getenv("RASPBERRY_PI_ENDPOINT", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
RASPBERRY_PI_API_KEY = os.getenv("RASPBERRY_PI_API_KEY", "")
MEDIATOR_DEVICE_ID = os.getenv("MEDIATOR_DEVICE_ID", "dualcam-001")

JPEG_QUALITY_STREAM = int(os.getenv("MEDIATOR_JPEG_QUALITY_STREAM", "75"))
JPEG_QUALITY_PAYLOAD = int(os.getenv("MEDIATOR_JPEG_QUALITY_PAYLOAD", "90"))


@dataclass
class CameraFrame:
    raw_frame: np.ndarray
    processed_frame: np.ndarray
    ts: float
    detections: List[Dict[str, object]] = field(default_factory=list)


class MediatorState:
    def __init__(self) -> None:
        self.frames: Dict[str, CameraFrame] = {}
        self.last_detect: Dict[str, object] = {}
        self.lock = threading.Lock()


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _encode_jpeg(frame: np.ndarray, quality: int) -> bytes:
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError("jpeg_encode_failed")
    return buf.tobytes()


def _encode_b64(frame: np.ndarray, quality: int) -> str:
    return base64.b64encode(_encode_jpeg(frame, quality)).decode("utf-8")


def _model_label(names: object, class_idx: int) -> str:
    if isinstance(names, dict):
        return str(names.get(class_idx, class_idx))
    if isinstance(names, list) and 0 <= class_idx < len(names):
        return str(names[class_idx])
    return str(class_idx)


def _extract_filtered_detections(result, allowed_classes: set[str]) -> List[Dict[str, object]]:
    boxes = result[0].boxes if result else None
    names = result[0].names if result else {}
    if boxes is None or len(boxes) == 0:
        return []

    detections: List[Dict[str, object]] = []
    for box in boxes:
        conf = float(box.conf.item())
        if conf < CONF_THRESHOLD:
            continue

        class_idx = int(box.cls.item())
        class_name = _model_label(names, class_idx).lower()
        if class_name not in allowed_classes:
            continue

        xyxy = box.xyxy.cpu().numpy().squeeze().astype(int).tolist()
        detections.append(
            {
                "class": class_name,
                "confidence": round(conf * 100.0, 2),
                "bbox": xyxy,
            }
        )

    return detections


def _draw_detections(frame: np.ndarray, detections: List[Dict[str, object]], color: Tuple[int, int, int]) -> np.ndarray:
    out = frame.copy()
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = f"{det['class']} {det['confidence']:.1f}%"
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        cv2.putText(out, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    return out


def _crop_top_flowers(frame: np.ndarray, detections: List[Dict[str, object]], limit: int = 3) -> List[str]:
    h, w = frame.shape[:2]
    crops: List[str] = []
    for idx, det in enumerate(detections[:limit], start=1):
        x1, y1, x2, y2 = det["bbox"]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        crops.append(_encode_b64(crop, JPEG_QUALITY_PAYLOAD))
    return crops


class DualCameraMediator:
    def __init__(self) -> None:
        self.state = MediatorState()
        self.session = requests.Session()
        self.flower_model = YOLO(FLOWER_MODEL_PATH, task="detect")
        self.disease_model = YOLO(DISEASE_MODEL_PATH, task="detect")

    def _run_camera_model(self, camera: str, frame: np.ndarray) -> Tuple[List[Dict[str, object]], np.ndarray]:
        if camera == CAM_REALSENSE:
            result = self.flower_model(frame, verbose=False)
            detections = _extract_filtered_detections(result, FLOWER_CLASSES)
            processed = _draw_detections(frame, detections, (0, 220, 0))
            cv2.putText(
                processed,
                f"RealSense flowers={len(detections)}",
                (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2,
            )
            return detections, processed

        result = self.disease_model(frame, verbose=False)
        detections = _extract_filtered_detections(result, DISEASE_CLASSES)
        processed = _draw_detections(frame, detections, (0, 80, 255))
        cv2.putText(
            processed,
            f"RPiCam3 diseases={len(detections)}",
            (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2,
        )
        return detections, processed

    def set_frame(self, camera: str, frame: np.ndarray) -> None:
        detections, processed = self._run_camera_model(camera, frame)
        with self.state.lock:
            self.state.frames[camera] = CameraFrame(
                raw_frame=frame,
                processed_frame=processed,
                detections=detections,
                ts=time.time(),
            )

    def get_frame(self, camera: str) -> Optional[CameraFrame]:
        with self.state.lock:
            payload = self.state.frames.get(camera)
            if payload is None:
                return None
            return CameraFrame(
                raw_frame=payload.raw_frame.copy(),
                processed_frame=payload.processed_frame.copy(),
                detections=list(payload.detections),
                ts=payload.ts,
            )

    def status(self) -> Dict[str, object]:
        with self.state.lock:
            now = time.time()
            cameras = {
                cam: {
                    "hasFrame": cam in self.state.frames,
                    "ageMs": round((now - self.state.frames[cam].ts) * 1000, 2)
                    if cam in self.state.frames
                    else None,
                }
                for cam in SUPPORTED_CAMERAS
            }
            return {
                "cameras": cameras,
                "lastDetect": self.state.last_detect,
                "supportedFlowers": sorted(FLOWER_CLASSES),
                "supportedDiseases": sorted(DISEASE_CLASSES),
            }

    def detect(self, user_token: Optional[str]) -> Dict[str, object]:
        rs_payload = self.get_frame(CAM_REALSENSE)
        rpi_payload = self.get_frame(CAM_RPI_CAM3)
        if rs_payload is None or rpi_payload is None:
            return {
                "success": False,
                "error": "frame_not_ready",
                "details": "Both cameras must publish at least one frame",
            }

        rs_frame = rs_payload.raw_frame
        flower_detections = rs_payload.detections
        disease_detections = rpi_payload.detections

        if len(flower_detections) == 0:
            status = "noObjects"
            confidence = None
        elif len(disease_detections) > 0:
            status = "diseased"
            confidence = max(
                [det["confidence"] for det in flower_detections + disease_detections],
                default=None,
            )
        else:
            status = "healthy"
            confidence = max([det["confidence"] for det in flower_detections], default=None)

        rs_annotated = rs_payload.processed_frame.copy()
        cv2.putText(
            rs_annotated,
            f"status={status} flowers={len(flower_detections)} diseases={len(disease_detections)}",
            (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2,
        )

        plant_images = _crop_top_flowers(rs_frame, flower_detections)
        metadata = {
            "created_at": _iso_now(),
            "objectCount": len(flower_detections) + len(disease_detections),
            "flower_classes": sorted(FLOWER_CLASSES),
            "disease_classes": sorted(DISEASE_CLASSES),
            "flowers": flower_detections,
            "diseases": disease_detections,
        }

        payload = {
            "device_id": MEDIATOR_DEVICE_ID,
            "main_image": _encode_b64(rs_annotated, JPEG_QUALITY_PAYLOAD),
            "status": status,
            "confidence": confidence,
            "metadata": metadata,
            "plant_images": plant_images,
        }

        cloud_response = self._forward_submit_detection(payload, user_token)
        result = {
            "success": cloud_response["success"],
            "status": status,
            "confidence": confidence,
            "flowerCount": len(flower_detections),
            "diseaseCount": len(disease_detections),
            "cloud": cloud_response,
        }

        with self.state.lock:
            self.state.last_detect = {
                "timestamp": _iso_now(),
                "result": result,
            }

        return result

    def _forward_submit_detection(self, payload: Dict[str, object], user_token: Optional[str]) -> Dict[str, object]:
        if not SUBMIT_ENDPOINT:
            return {"success": False, "error": "RASPBERRY_PI_ENDPOINT is not configured"}
        if not SUPABASE_ANON_KEY or not RASPBERRY_PI_API_KEY:
            return {
                "success": False,
                "error": "SUPABASE_ANON_KEY or RASPBERRY_PI_API_KEY is missing",
            }

        auth = user_token if user_token else SUPABASE_ANON_KEY
        headers = {
            "Authorization": f"Bearer {auth}",
            "apikey": SUPABASE_ANON_KEY,
            "X-Raspberry-Pi-Key": RASPBERRY_PI_API_KEY,
            "Content-Type": "application/json",
        }

        try:
            resp = self.session.post(SUBMIT_ENDPOINT, headers=headers, json=payload, timeout=45)
            content_type = resp.headers.get("content-type", "")
            body: object = resp.json() if "application/json" in content_type else resp.text
            if not resp.ok:
                return {"success": False, "statusCode": resp.status_code, "body": body}
            return {"success": True, "statusCode": resp.status_code, "body": body}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}


mediator = DualCameraMediator()
app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response


@app.route("/health", methods=["GET", "OPTIONS"])
@app.route("/status", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 204
    return jsonify(mediator.status())


@app.route("/ingest/<camera>", methods=["POST", "OPTIONS"])
def ingest(camera: str):
    if request.method == "OPTIONS":
        return "", 204

    if camera not in SUPPORTED_CAMERAS:
        return jsonify({"success": False, "error": "unsupported_camera"}), 404

    body = request.get_data(cache=False)
    if not body:
        return jsonify({"success": False, "error": "empty_body"}), 400

    arr = np.frombuffer(body, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return jsonify({"success": False, "error": "invalid_jpeg"}), 400

    mediator.set_frame(camera, frame)
    return jsonify({"success": True, "camera": camera, "ts": _iso_now()})


@app.route("/camera/<camera>/snapshot", methods=["GET"])
def camera_snapshot(camera: str):
    if camera not in SUPPORTED_CAMERAS:
        return jsonify({"success": False, "error": "unsupported_camera"}), 404

    payload = mediator.get_frame(camera)
    if payload is None:
        return jsonify({"success": False, "error": "frame_not_ready"}), 503

    return Response(
        _encode_jpeg(payload.processed_frame, JPEG_QUALITY_STREAM),
        mimetype="image/jpeg",
    )


@app.route("/camera/<camera>/stream", methods=["GET"])
def camera_stream(camera: str):
    if camera not in SUPPORTED_CAMERAS:
        return jsonify({"success": False, "error": "unsupported_camera"}), 404

    def generate():
        while True:
            payload = mediator.get_frame(camera)
            if payload is None:
                time.sleep(0.05)
                continue
            jpeg = _encode_jpeg(payload.processed_frame, JPEG_QUALITY_STREAM)
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            time.sleep(0.03)

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/detect", methods=["POST", "OPTIONS"])
def detect():
    if request.method == "OPTIONS":
        return "", 204

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None
    result = mediator.detect(token)
    status_code = 200 if result.get("success") else 503
    return jsonify(result), status_code


if __name__ == "__main__":
    print(f"Dual-camera mediator listening on http://{MEDIATOR_HOST}:{MEDIATOR_PORT}")
    print(f"Flower model: {FLOWER_MODEL_PATH}")
    print(f"Disease model: {DISEASE_MODEL_PATH}")
    app.run(host=MEDIATOR_HOST, port=MEDIATOR_PORT, debug=False)
