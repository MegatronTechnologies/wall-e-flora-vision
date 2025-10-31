"""
Utility functions for YOLO Detection Service.

Contains logging setup, timestamp generation, and helper functions.
"""
import logging
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Tuple


def setup_logging() -> logging.Logger:
    """Setup structured logging with automatic rotation (5MB max, 3 backups)."""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "yolo_detect.log"

    logger = logging.getLogger("yolo_detect")
    logger.setLevel(logging.DEBUG)

    # Console handler (INFO level)
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(
        logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )
    )

    # Rotating file handler (DEBUG level, 5MB max, 3 backups)
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    logger.addHandler(console)
    logger.addHandler(file_handler)

    return logger


def iso_now() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def timestamp_str() -> str:
    """Generate timestamp string for filenames (millisecond precision)."""
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]


def safe_bbox_coords(
    xmin: int, ymin: int, xmax: int, ymax: int, w: int, h: int
) -> Tuple[int, int, int, int]:
    """Ensure bounding box coordinates are within frame bounds."""
    xmin = max(0, min(xmin, w - 1))
    ymin = max(0, min(ymin, h - 1))
    xmax = max(0, min(xmax, w - 1))
    ymax = max(0, min(ymax, h - 1))
    return xmin, ymin, xmax, ymax


# Create logger instance
logger = setup_logging()
