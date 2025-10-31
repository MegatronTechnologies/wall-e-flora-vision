"""
Configuration module for YOLO Detection Service.

Contains all environment variables, constants, and paths used throughout the application.
"""
import os
from pathlib import Path

# -----------------------------
# Environment Variables
# -----------------------------

# YOLO Model Configuration
MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "best_ncnn_model")

# RealSense Camera Configuration
FRAME_WIDTH = int(os.getenv("RS_FRAME_WIDTH", "1280"))
FRAME_HEIGHT = int(os.getenv("RS_FRAME_HEIGHT", "720"))
FRAME_RATE = int(os.getenv("RS_FRAME_RATE", "15"))

# Detection & Sending Configuration
SEND_INTERVAL = float(os.getenv("RS_SEND_INTERVAL", "15"))
CONF_THRESHOLD = float(os.getenv("RS_CONF_THRESHOLD", "0.5"))

# HTTP Server Configuration
STREAM_HOST = os.getenv("RS_STREAM_HOST", "0.0.0.0")
STREAM_PORT = int(os.getenv("RS_STREAM_PORT", "8080"))

# Image Quality Configuration
JPEG_QUALITY = int(os.getenv("RS_JPEG_QUALITY", "90"))

# Display Configuration
ENABLE_DISPLAY = os.getenv("RS_ENABLE_DISPLAY", "0").lower() in {"1", "true", "yes"}
WINDOW_NAME = "YOLO Detection Results"

# Raspberry Pi & Cloud Configuration
DEVICE_ID = os.getenv("RASPBERRY_PI_DEVICE_ID")
API_KEY = os.getenv("RASPBERRY_PI_API_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
ENDPOINT = os.getenv(
    "RASPBERRY_PI_ENDPOINT",
    "https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection",
)

# -----------------------------
# Paths
# -----------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
STREAMSCAN_DIR = SCRIPT_DIR / "StreamScan"
STREAMFRAME_DIR = SCRIPT_DIR / "StreamFrame"

# Create directories if they don't exist
STREAMSCAN_DIR.mkdir(exist_ok=True)
STREAMFRAME_DIR.mkdir(exist_ok=True)

# -----------------------------
# Constants
# -----------------------------

# Bounding box colors (10 colors for different classes)
BBOX_COLORS = [
    (164, 120, 87),
    (68, 148, 228),
    (93, 97, 209),
    (178, 182, 133),
    (88, 159, 106),
    (96, 202, 231),
    (159, 124, 168),
    (169, 162, 241),
    (98, 118, 150),
    (172, 176, 184),
]
