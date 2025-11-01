"""
Flask HTTP server for YOLO Detection Service.

Provides HTTP endpoints for snapshot, status, detection triggering, and MJPEG streaming.
"""
import time

from flask import Flask, Response, jsonify, request

from detection_service import DetectionService

# Initialize detection service
service = DetectionService()

# Create Flask application
app = Flask(__name__)

# CORS configuration for web apps
ALLOWED_ORIGINS = [
    "https://6f57ff6c-8105-4412-aa58-20836cc6cf0a.lovableproject.com",
    "https://megtech.online",  # Production domain
    "http://localhost:5173",  # Local development
    "http://localhost:3000",
]


@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses for web app access."""
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS or (
        origin
        and origin.startswith("https://")
        and ("lovableproject.com" in origin or "megtech.online" in origin)
    ):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
    return response


@app.route("/detect", methods=["OPTIONS"])
@app.route("/status", methods=["OPTIONS"])
@app.route("/snapshot", methods=["OPTIONS"])
def handle_preflight():
    """Handle CORS preflight requests."""
    return "", 204


@app.route("/snapshot")
def snapshot() -> Response:
    """Return latest frame as JPEG image."""
    payload = service.get_snapshot()
    if payload is None:
        return jsonify({"error": "frame_not_ready"}), 503
    return Response(payload, mimetype="image/jpeg")


@app.route("/status")
def status():
    """Return detection status as JSON."""
    return jsonify(service.get_status())


@app.route("/detect", methods=["POST"])
def detect():
    """Trigger manual detection and send to cloud immediately."""
    # Get user token from Authorization header if present
    auth_header = request.headers.get("Authorization")
    user_token = None
    if auth_header and auth_header.startswith("Bearer "):
        user_token = auth_header.split(" ")[1]

    result = service.trigger_detection(user_token=user_token)
    if result.get("success"):
        return jsonify(result), 200
    else:
        return jsonify(result), 503


@app.route("/stream")
def stream():
    """MJPEG streaming endpoint for real-time video (optimized with pre-encoded JPEG cache)."""

    def generate():
        while True:
            # Use cached JPEG buffer (pre-encoded in detection loop)
            jpeg_bytes = service.get_cached_jpeg_stream()
            if jpeg_bytes is None:
                time.sleep(0.1)
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"
            )
            # No artificial delay - frames sent as fast as available
            # No JPEG encoding overhead - using pre-encoded buffer

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


def get_service() -> DetectionService:
    """Get the detection service instance."""
    return service
