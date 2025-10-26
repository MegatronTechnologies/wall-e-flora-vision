# Raspberry Pi - Plant Disease Detection

YOLO-based plant disease detection service for Raspberry Pi with Intel RealSense camera.

## 🚀 Quick Start

```bash
cd /home/MegTech/Desktop/wall-e-flora-vision/raspberry-src

# Load environment variables
source pi-env.sh

# Run detection service
python3 yolo_detect.py
```

The service will:
- ✅ Start RealSense camera (640x480@15fps)
- ✅ Run YOLO inference on each frame
- ✅ Expose HTTP API at `http://0.0.0.0:8080`
- ✅ Send detections to Supabase automatically

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/snapshot` | GET | Latest JPEG frame from camera |
| `/status` | GET | Detection status, FPS, confidence |
| `/detect` | POST | Trigger manual detection |

**Example:**
```bash
curl http://localhost:8080/status
curl http://localhost:8080/snapshot -o frame.jpg
curl -X POST http://localhost:8080/detect
```

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Installation and configuration
- **[API Reference](docs/API.md)** - Detailed endpoint documentation
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🔧 Environment Variables

Required (set in `pi-env.sh`):
```bash
RASPBERRY_PI_DEVICE_ID="raspi-001"
RASPBERRY_PI_API_KEY="your-api-key"
SUPABASE_ANON_KEY="your-supabase-key"
```

## 📊 Detection Status

- **healthy** - Only plants detected (no pests)
- **diseased** - Mealybug pest detected
- **mixed** - Both plants and pests
- **noObjects** - Nothing detected

## 📝 Logs

Logs are saved to `logs/yolo_detect.log` (overwrites on each run):

```bash
# Watch logs in real-time
tail -f logs/yolo_detect.log

# Find errors
grep ERROR logs/yolo_detect.log
```

## 🗂️ Archive

Previous documentation versions: [docs/archive/](docs/archive/)
