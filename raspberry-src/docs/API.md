# API Reference

HTTP API endpoints provided by `yolo_detect.py` service.

**Base URL:** `http://<raspberry-pi-ip>:8080` (default: port 8080)

---

## GET /snapshot

Returns the latest camera frame as JPEG image.

**Response:**
- **Content-Type:** `image/jpeg`
- **Status:** `200 OK` or `503 Service Unavailable`

**Example:**
```bash
curl http://192.168.1.100:8080/snapshot -o latest_frame.jpg
```

**Use case:** Live video stream, manual inspection

---

## GET /status

Returns current detection status and system metrics.

**Response:** JSON
```json
{
  "deviceId": "raspi-001",
  "status": "healthy",           // "healthy" | "diseased" | "mixed" | "noObjects"
  "confidence": 87.5,             // 0-100 (percentage)
  "objectCount": 3,               // Number of detected objects
  "avgFps": 12.34,                // Average FPS
  "lastFrameTs": 1729865432.123,  // Unix timestamp
  "lastSendResponse": {...},      // Last cloud response
  "lastSendError": null,          // Error message if any
  "supabaseLastResponse": {...},  // Last Supabase response
  "supabaseLastError": null,
  "sendInterval": 15,             // Auto-send interval (seconds)
  "endpoint": "https://..."       // Cloud endpoint URL
}
```

**Example:**
```bash
curl http://192.168.1.100:8080/status | jq .
```

**Use case:** Real-time monitoring, dashboard status indicator

---

## POST /detect

Manually trigger detection and send results to cloud immediately.

**Request:** Empty POST body

**Response:** JSON
```json
{
  "success": true,
  "status": "diseased",
  "confidence": 92.3,
  "objectCount": 2,
  "timestamp": "2025-10-25T14:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "no_frame_available"
}
```

**Example:**
```bash
curl -X POST http://192.168.1.100:8080/detect
```

**Use case:** Manual scan button in dashboard

---

## Status Values

| Status | Description | Color |
|--------|-------------|-------|
| `healthy` | Only chrysanthemum plants detected (no pests) | 🟢 Green |
| `diseased` | Mealybug pest detected | 🔴 Red |
| `mixed` | Both plants and pests detected | 🟡 Yellow |
| `noObjects` | No objects detected above threshold | ⚪ Gray |

---

## Error Codes

| Code | Reason | Solution |
|------|--------|----------|
| `503` | Frame not ready | Wait a few seconds and retry |
| `500` | Internal server error | Check logs: `tail -f logs/yolo_detect.log` |

---

## Integration Examples

### JavaScript (fetch)
```javascript
// Get status
const response = await fetch('http://192.168.1.100:8080/status');
const data = await response.json();
console.log(data.status, data.confidence);

// Trigger detection
await fetch('http://192.168.1.100:8080/detect', { method: 'POST' });
```

### Python (requests)
```python
import requests

# Get snapshot
response = requests.get('http://192.168.1.100:8080/snapshot')
with open('frame.jpg', 'wb') as f:
    f.write(response.content)

# Get status
status = requests.get('http://192.168.1.100:8080/status').json()
print(f"Status: {status['status']}, Confidence: {status['confidence']}%")
```

### cURL
```bash
# Status
curl http://192.168.1.100:8080/status | jq '.status, .confidence'

# Snapshot
curl http://192.168.1.100:8080/snapshot -o frame.jpg

# Detect
curl -X POST http://192.168.1.100:8080/detect | jq .
```

---

## Rate Limiting

No rate limiting by default. Service processes requests as they arrive.

⚠️ **Note:** Automatic cloud submission interval is controlled by `RS_SEND_INTERVAL` environment variable (default: 15 seconds).
