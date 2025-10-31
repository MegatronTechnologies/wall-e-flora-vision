"""
Cleanup utilities for YOLO Detection Service.

Handles automatic cleanup of pending cache, old images, and temporary files.
"""
import json
import os
import time
from pathlib import Path
from typing import Dict, List

from utils import logger

# Cleanup configuration (can be overridden by environment variables)
PENDING_MAX_AGE_DAYS = int(os.getenv("CLEANUP_PENDING_MAX_AGE_DAYS", "7"))
PENDING_MAX_RETRIES = int(os.getenv("CLEANUP_PENDING_MAX_RETRIES", "10"))
PENDING_MAX_ENTRIES = int(os.getenv("CLEANUP_PENDING_MAX_ENTRIES", "100"))


def cleanup_pending_cache(pending_path: str = "pending_supabase.json") -> Dict[str, int]:
    """
    Clean up old and failed entries from pending cache file.

    Removes:
    - Entries older than PENDING_MAX_AGE_DAYS (default: 7 days)
    - Entries with more than PENDING_MAX_RETRIES failed attempts (default: 10)
    - Keeps only the most recent PENDING_MAX_ENTRIES entries (default: 100)

    Returns:
        Dict with cleanup statistics: {
            "total_before": int,
            "removed_old": int,
            "removed_max_retries": int,
            "removed_excess": int,
            "total_after": int
        }
    """
    if not os.path.exists(pending_path):
        logger.debug(f"Pending cache file not found: {pending_path}")
        return {
            "total_before": 0,
            "removed_old": 0,
            "removed_max_retries": 0,
            "removed_excess": 0,
            "total_after": 0,
        }

    try:
        with open(pending_path, "r", encoding="utf-8") as f:
            entries = json.load(f)
    except (json.JSONDecodeError, IOError) as exc:
        logger.warning(f"Failed to read pending cache: {exc}")
        return {
            "total_before": 0,
            "removed_old": 0,
            "removed_max_retries": 0,
            "removed_excess": 0,
            "total_after": 0,
        }

    if not isinstance(entries, list):
        logger.warning(f"Invalid pending cache format (expected list): {type(entries)}")
        return {
            "total_before": 0,
            "removed_old": 0,
            "removed_max_retries": 0,
            "removed_excess": 0,
            "total_after": 0,
        }

    total_before = len(entries)
    current_time = time.time()
    max_age_seconds = PENDING_MAX_AGE_DAYS * 24 * 3600

    # Filter out old entries
    filtered_entries = []
    removed_old = 0
    removed_max_retries = 0

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        # Check age
        entry_timestamp = entry.get("ts", 0)
        age_seconds = current_time - entry_timestamp
        if age_seconds > max_age_seconds:
            removed_old += 1
            continue

        # Check retry count
        retry_count = entry.get("retries", 0)
        if retry_count > PENDING_MAX_RETRIES:
            removed_max_retries += 1
            continue

        filtered_entries.append(entry)

    # Keep only most recent entries (sorted by timestamp, newest first)
    filtered_entries.sort(key=lambda x: x.get("ts", 0), reverse=True)
    removed_excess = max(0, len(filtered_entries) - PENDING_MAX_ENTRIES)
    filtered_entries = filtered_entries[:PENDING_MAX_ENTRIES]

    total_after = len(filtered_entries)

    # Write back cleaned entries
    try:
        tmp_path = f"{pending_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(filtered_entries, f, indent=2)
        os.replace(tmp_path, pending_path)
    except IOError as exc:
        logger.error(f"Failed to write cleaned pending cache: {exc}")
        return {
            "total_before": total_before,
            "removed_old": removed_old,
            "removed_max_retries": removed_max_retries,
            "removed_excess": removed_excess,
            "total_after": total_before,  # Failed to clean, so count is unchanged
        }

    stats = {
        "total_before": total_before,
        "removed_old": removed_old,
        "removed_max_retries": removed_max_retries,
        "removed_excess": removed_excess,
        "total_after": total_after,
    }

    if removed_old + removed_max_retries + removed_excess > 0:
        logger.info(
            f"Pending cache cleaned: {total_before} → {total_after} entries "
            f"(removed: {removed_old} old, {removed_max_retries} max retries, {removed_excess} excess)"
        )
    else:
        logger.debug(f"Pending cache check: {total_after} entries (no cleanup needed)")

    return stats


def cleanup_images(
    directory: Path,
    max_age_days: int = 30,
    max_count: int = 500,
    max_size_mb: int = 1024,
) -> Dict[str, int]:
    """
    Clean up old images from a directory.

    Args:
        directory: Path to image directory
        max_age_days: Remove files older than this (default: 30 days)
        max_count: Keep only this many most recent files (default: 500)
        max_size_mb: Remove oldest files if total size exceeds this (default: 1024 MB)

    Returns:
        Dict with cleanup statistics: {
            "total_before": int,
            "removed_old": int,
            "removed_excess": int,
            "removed_size": int,
            "total_after": int
        }
    """
    if not directory.exists():
        return {
            "total_before": 0,
            "removed_old": 0,
            "removed_excess": 0,
            "removed_size": 0,
            "total_after": 0,
        }

    # Get all image files with their stats
    image_files: List[tuple] = []
    for file_path in directory.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
            stat = file_path.stat()
            image_files.append((file_path, stat.st_mtime, stat.st_size))

    total_before = len(image_files)
    if total_before == 0:
        return {
            "total_before": 0,
            "removed_old": 0,
            "removed_excess": 0,
            "removed_size": 0,
            "total_after": 0,
        }

    current_time = time.time()
    max_age_seconds = max_age_days * 24 * 3600
    removed_old = 0
    removed_excess = 0
    removed_size = 0

    # Sort by modification time (oldest first)
    image_files.sort(key=lambda x: x[1])

    # Remove old files
    remaining_files = []
    for file_path, mtime, size in image_files:
        age_seconds = current_time - mtime
        if age_seconds > max_age_seconds:
            try:
                file_path.unlink()
                removed_old += 1
            except OSError as exc:
                logger.warning(f"Failed to remove old image {file_path}: {exc}")
                remaining_files.append((file_path, mtime, size))
        else:
            remaining_files.append((file_path, mtime, size))

    # Remove excess files (keep only max_count most recent)
    if len(remaining_files) > max_count:
        excess_count = len(remaining_files) - max_count
        for file_path, _, _ in remaining_files[:excess_count]:
            try:
                file_path.unlink()
                removed_excess += 1
            except OSError as exc:
                logger.warning(f"Failed to remove excess image {file_path}: {exc}")
        remaining_files = remaining_files[excess_count:]

    # Remove oldest files if total size exceeds max_size_mb
    max_size_bytes = max_size_mb * 1024 * 1024
    total_size = sum(size for _, _, size in remaining_files)
    while total_size > max_size_bytes and remaining_files:
        file_path, _, size = remaining_files.pop(0)
        try:
            file_path.unlink()
            total_size -= size
            removed_size += 1
        except OSError as exc:
            logger.warning(f"Failed to remove large image {file_path}: {exc}")

    total_after = len(remaining_files)

    stats = {
        "total_before": total_before,
        "removed_old": removed_old,
        "removed_excess": removed_excess,
        "removed_size": removed_size,
        "total_after": total_after,
    }

    if removed_old + removed_excess + removed_size > 0:
        logger.info(
            f"Image cleanup in {directory.name}: {total_before} → {total_after} files "
            f"(removed: {removed_old} old, {removed_excess} excess, {removed_size} size)"
        )

    return stats


def cleanup_on_startup() -> Dict[str, Dict]:
    """
    Run cleanup tasks on service startup.

    Cleans:
    - Pending Supabase cache (pending_supabase.json)

    Returns:
        Dict with cleanup statistics for each task
    """
    logger.info("Running startup cleanup tasks...")

    results = {}

    # Clean pending cache
    try:
        results["pending_cache"] = cleanup_pending_cache()
    except Exception as exc:  # pylint: disable=broad-except
        logger.error(f"Pending cache cleanup failed: {exc}", exc_info=True)
        results["pending_cache"] = {"error": str(exc)}

    logger.info("Startup cleanup completed")
    return results
