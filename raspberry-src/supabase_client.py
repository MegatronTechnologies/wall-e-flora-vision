"""Supabase helper for saving detection results.

The Pi already posts base64 images to the Lovable Edge Function. This module
provides an optional path to talk directly with Supabase Storage + REST APIs
when the corresponding environment variables are present.
"""
from __future__ import annotations

import base64
import json
import os
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional

import requests

DEFAULT_TIMEOUT = float(os.getenv("SUPABASE_TIMEOUT", "15"))


def _read_env(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value:
        value = value.strip()
    return value or None


@dataclass
class SupabaseConfig:
    url: str
    table: str
    api_key: str
    storage_bucket: str

    @classmethod
    def from_env(cls) -> Optional["SupabaseConfig"]:
        url = _read_env("SUPABASE_URL")
        table = _read_env("SUPABASE_TABLE")
        api_key = _read_env("SUPABASE_SERVICE_ROLE_KEY") or _read_env("SUPABASE_ANON_KEY")
        storage_bucket = _read_env("SUPABASE_STORAGE_BUCKET")
        if not url or not table or not api_key or not storage_bucket:
            return None
        return cls(url=url.rstrip("/"), table=table, api_key=api_key, storage_bucket=storage_bucket)


class SupabaseDetectionWriter:
    """Send detection rows (and optional image uploads) to Supabase."""

    def __init__(self, session: Optional[requests.Session] = None) -> None:
        self.session = session or requests.Session()
        self.cfg = SupabaseConfig.from_env()
        self.storage_path_prefix = _read_env("SUPABASE_STORAGE_PREFIX") or "detections"
        self.pending_path = _read_env("SUPABASE_PENDING_PATH") or "pending_supabase.json"

    def is_enabled(self) -> bool:
        return self.cfg is not None

    # ------------------------------------------------------------------
    def send_detection(
        self,
        payload: Dict[str, Any],
        base64_image: Optional[str],
        filename: str,
    ) -> Dict[str, Any]:
        if not self.cfg:
            return {"enabled": False}
        try:
            return self._send_once(payload, base64_image, filename)
        except requests.RequestException as exc:
            self._append_pending(
                {
                    "payload": payload,
                    "image_b64": base64_image,
                    "filename": filename,
                    "ts": time.time(),
                    "error": str(exc),
                }
            )
            raise

    def flush_pending(self) -> Iterable[Dict[str, Any]]:
        if not self.cfg:
            return []
        entries = self._read_pending_entries()
        if not entries:
            return []
        succeeded = []
        remaining = []
        for entry in entries:
            payload = entry.get("payload")
            base64_image = entry.get("image_b64")
            filename = entry.get("filename") or "pending.jpg"
            try:
                self._send_once(payload, base64_image, filename)
                entry.setdefault("retries", 0)
                succeeded.append(entry)
            except requests.RequestException:
                entry.setdefault("retries", 0)
                entry["retries"] += 1
                remaining.append(entry)
        self._write_pending_entries(remaining)
        return succeeded

    # ------------------------------------------------------------------
    def _send_once(
        self,
        payload: Dict[str, Any],
        base64_image: Optional[str],
        filename: str,
    ) -> Dict[str, Any]:
        if not self.cfg:
            raise requests.RequestException("Supabase configuration missing")
        if not isinstance(payload, dict):
            raise requests.RequestException("Supabase payload must be a dict")

        device_id = payload.get("device_id")
        if not device_id:
            raise requests.RequestException("device_id is required for Supabase insert")

        metadata = payload.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {"value": metadata}

        image_url = None
        if base64_image:
            image_bytes = base64.b64decode(base64_image)
            storage_path = self._build_storage_path(device_id, filename)
            self._upload_image(storage_path, image_bytes)
            image_url = self._public_url(storage_path)

        insert_body = {
            "device_id": device_id,
            "status": payload.get("status"),
            "confidence": payload.get("confidence"),
            "metadata": metadata or None,
            "image_url": image_url,
        }

        response = self._post_row(insert_body)
        response.raise_for_status()
        return {
            "status": "success",
            "data": response.json() if response.content else None,
            "image_url": image_url,
        }

    def _post_row(self, body: Dict[str, Any]) -> requests.Response:
        assert self.cfg is not None  # guarded by caller
        url = f"{self.cfg.url}/rest/v1/{self.cfg.table}"
        headers = {
            "apikey": self.cfg.api_key,
            "Authorization": f"Bearer {self.cfg.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        return self.session.post(url, headers=headers, json=body, timeout=DEFAULT_TIMEOUT)

    def _upload_image(self, storage_path: str, image_bytes: bytes) -> None:
        assert self.cfg is not None  # guarded by caller
        url = f"{self.cfg.url}/storage/v1/object/{self.cfg.storage_bucket}/{storage_path}"
        headers = {
            "apikey": self.cfg.api_key,
            "Authorization": f"Bearer {self.cfg.api_key}",
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        }
        response = self.session.post(url, headers=headers, data=image_bytes, timeout=DEFAULT_TIMEOUT)
        response.raise_for_status()

    def _public_url(self, storage_path: str) -> str:
        assert self.cfg is not None  # guarded by caller
        return (
            f"{self.cfg.url}/storage/v1/object/public/{self.cfg.storage_bucket}/{storage_path}"
        )

    def _build_storage_path(self, device_id: str, filename: str) -> str:
        device_slug = device_id.strip().replace(" ", "-")
        name, ext = os.path.splitext(filename)
        timestamp_part = name or int(time.time())
        ext = ext or ".jpg"
        unique = uuid.uuid4().hex
        prefix = self.storage_path_prefix.strip("/")
        return f"{prefix}/{device_slug}/{timestamp_part}_main_{unique}{ext}"

    # ---------------------- pending storage helpers ------------------
    def _append_pending(self, payload: Dict[str, Any]) -> None:
        entries = self._read_pending_entries()
        entries.append(payload)
        self._write_pending_entries(entries)

    def _read_pending_entries(self) -> list:
        path = self.pending_path
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            return []
        except json.JSONDecodeError:
            return []

    def _write_pending_entries(self, entries: list) -> None:
        path = self.pending_path
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as fh:
            json.dump(entries, fh)
        os.replace(tmp_path, path)
