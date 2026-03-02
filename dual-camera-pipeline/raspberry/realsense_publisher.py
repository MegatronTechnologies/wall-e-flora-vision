#!/usr/bin/env python3
"""Intel RealSense frame publisher for the dual-camera mediator."""
from __future__ import annotations

import os
import time

import cv2
import numpy as np
import pyrealsense2 as rs
import requests

MEDIATOR_URL = os.getenv("MEDIATOR_URL", "http://127.0.0.1:8090")
INGEST_URL = f"{MEDIATOR_URL.rstrip('/')}/ingest/realsense"
FRAME_WIDTH = int(os.getenv("RS_FRAME_WIDTH", "1280"))
FRAME_HEIGHT = int(os.getenv("RS_FRAME_HEIGHT", "720"))
FRAME_RATE = int(os.getenv("RS_FRAME_RATE", "15"))
JPEG_QUALITY = int(os.getenv("RS_JPEG_QUALITY", "82"))
TIMEOUT_SEC = float(os.getenv("RS_POST_TIMEOUT", "2.0"))


def main() -> None:
    session = requests.Session()
    pipeline = rs.pipeline()
    cfg = rs.config()
    cfg.enable_stream(rs.stream.color, FRAME_WIDTH, FRAME_HEIGHT, rs.format.bgr8, FRAME_RATE)

    pipeline.start(cfg)
    print(f"RealSense publisher started -> {INGEST_URL}")

    try:
        while True:
            frames = pipeline.wait_for_frames(timeout_ms=5000)
            color_frame = frames.get_color_frame()
            if not color_frame:
                continue

            frame = np.asanyarray(color_frame.get_data())
            ok, jpg = cv2.imencode(
                ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
            )
            if not ok:
                continue

            try:
                session.post(
                    INGEST_URL,
                    data=jpg.tobytes(),
                    headers={"Content-Type": "image/jpeg"},
                    timeout=TIMEOUT_SEC,
                )
            except requests.RequestException:
                pass

            time.sleep(0.001)
    finally:
        pipeline.stop()


if __name__ == "__main__":
    main()
