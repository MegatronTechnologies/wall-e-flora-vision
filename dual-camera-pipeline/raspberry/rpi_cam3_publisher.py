#!/usr/bin/env python3
"""RPi Cam3 frame publisher for the dual-camera mediator.

Initialization and color conversion follow the verified script:
- YUV420 capture
- cv2.COLOR_YUV2BGR_I420 conversion
- AWB/AE enabled
"""
from __future__ import annotations

import os
import time

import cv2
import requests
from libcamera import ColorSpace
from picamera2 import Picamera2

MEDIATOR_URL = os.getenv("MEDIATOR_URL", "http://127.0.0.1:8090")
INGEST_URL = f"{MEDIATOR_URL.rstrip('/')}/ingest/rpi-cam3"
FRAME_RATE = int(os.getenv("RPI_CAM3_FRAME_RATE", "24"))
JPEG_QUALITY = int(os.getenv("RPI_CAM3_JPEG_QUALITY", "82"))
TIMEOUT_SEC = float(os.getenv("RPI_CAM3_POST_TIMEOUT", "2.0"))


def pick_camera_num() -> int:
    info = Picamera2.global_camera_info()
    if not info:
        raise RuntimeError("No Pi camera detected by libcamera")

    for i, cam in enumerate(info):
        model = str(cam.get("Model", "")).lower()
        if "imx708" in model or "camera module 3" in model:
            return i

    return 0


def main() -> None:
    session = requests.Session()
    cam_num = pick_camera_num()
    picam = Picamera2(camera_num=cam_num)

    config = picam.create_video_configuration(
        main={"size": (1920, 1080), "format": "YUV420"},
        colour_space=ColorSpace.Srgb(),
        controls={"FrameRate": FRAME_RATE},
    )
    picam.configure(config)

    picam.set_controls(
        {
            "AeEnable": True,
            "AwbEnable": True,
            "Saturation": 1.0,
            "Contrast": 1.0,
            "Brightness": 0.0,
        }
    )

    picam.start()

    warmup_until = time.time() + 4.0
    while time.time() < warmup_until:
        _ = picam.capture_array()

    print(f"Cam3 publisher started -> {INGEST_URL}")

    frame_interval = 1.0 / max(FRAME_RATE, 1)
    try:
        while True:
            started = time.time()
            yuv = picam.capture_array()
            bgr = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR_I420)
            ok, jpg = cv2.imencode(
                ".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
            )
            if ok:
                try:
                    session.post(
                        INGEST_URL,
                        data=jpg.tobytes(),
                        headers={"Content-Type": "image/jpeg"},
                        timeout=TIMEOUT_SEC,
                    )
                except requests.RequestException:
                    pass

            elapsed = time.time() - started
            if elapsed < frame_interval:
                time.sleep(frame_interval - elapsed)
    finally:
        picam.stop()


if __name__ == "__main__":
    main()
