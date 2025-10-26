# Setup Guide

Complete installation and configuration guide for Raspberry Pi detection service.

---

## Hardware Requirements

- Raspberry Pi 4 (4GB+ RAM recommended)
- Intel RealSense D435 camera
- MicroSD card (32GB+)
- Stable power supply (5V 3A)
- Network connection (WiFi or Ethernet)

---

## Software Installation

### 1. System Update

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2. Python Dependencies

```bash
sudo apt-get install python3-pip python3-dev -y
```

### 3. RealSense SDK

```bash
# Add Intel repository
sudo mkdir -p /etc/apt/keyrings
curl -sSf https://librealsense.intel.com/Debian/librealsense.pgp | sudo tee /etc/apt/keyrings/librealsense.pgp > /dev/null

echo "deb [signed-by=/etc/apt/keyrings/librealsense.pgp] https://librealsense.intel.com/Debian/apt-repo `lsb_release -cs` main" | sudo tee /etc/apt/sources.list.d/librealsense.list

# Install
sudo apt-get update
sudo apt-get install librealsense2-dkms librealsense2-utils librealsense2-dev -y

# Test camera
realsense-viewer
```

### 4. Python Packages

```bash
cd /home/MegTech/Desktop/wall-e-flora-vision/raspberry-src

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install ultralytics opencv-python pyrealsense2 flask requests
```

---

## Configuration

### 1. Environment Variables

Edit `pi-env.sh`:

```bash
nano pi-env.sh
```

Set required values:
```bash
export SUPABASE_ANON_KEY="eyJhbGci..."
export RASPBERRY_PI_DEVICE_ID="raspi-001"
export RASPBERRY_PI_API_KEY="your-secret-key"
export RASPBERRY_PI_ENDPOINT="https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection"
```

### 2. Optional Tuning

Camera settings:
```bash
export RS_FRAME_WIDTH=640        # Default: 640
export RS_FRAME_HEIGHT=480       # Default: 480
export RS_FRAME_RATE=15          # Default: 15

export RS_CONF_THRESHOLD=0.5     # Confidence threshold (0-1)
export RS_SEND_INTERVAL=15       # Auto-send interval (seconds)
export RS_JPEG_QUALITY=90        # JPEG quality (0-100)
```

### 3. Verify Configuration

```bash
source pi-env.sh
echo $RASPBERRY_PI_DEVICE_ID  # Should print: raspi-001
```

---

## Running the Service

### Manual Start

```bash
cd /home/MegTech/Desktop/wall-e-flora-vision/raspberry-src
source pi-env.sh
python3 yolo_detect.py
```

You should see:
```
2025-10-26 10:00:00 [INFO] ============================================================
2025-10-26 10:00:00 [INFO] YOLO Detection Service - Starting
2025-10-26 10:00:00 [INFO] ============================================================
2025-10-26 10:00:02 [INFO] RealSense pipeline запущен 640x480@15
2025-10-26 10:00:02 [INFO] HTTP сервер запущен на 0.0.0.0:8080
```

### Auto-start on Boot (systemd)

Create service file:
```bash
sudo nano /etc/systemd/system/plant-detection.service
```

Add:
```ini
[Unit]
Description=Plant Disease Detection Service
After=network.target

[Service]
Type=simple
User=MegTech
WorkingDirectory=/home/MegTech/Desktop/wall-e-flora-vision/raspberry-src
ExecStartPre=/bin/bash -c 'source /home/MegTech/Desktop/wall-e-flora-vision/raspberry-src/pi-env.sh'
ExecStart=/usr/bin/python3 /home/MegTech/Desktop/wall-e-flora-vision/raspberry-src/yolo_detect.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable plant-detection
sudo systemctl start plant-detection

# Check status
sudo systemctl status plant-detection

# View logs
journalctl -u plant-detection -f
```

---

## Logging

### Log Files

Logs are saved to `logs/yolo_detect.log` and overwritten on each service restart.

**View logs:**
```bash
# Real-time
tail -f logs/yolo_detect.log

# Full log
cat logs/yolo_detect.log

# Errors only
grep ERROR logs/yolo_detect.log
```

### Log Levels

- **DEBUG** - Detailed info (file only)
- **INFO** - General info (console + file)
- **WARNING** - Warnings
- **ERROR** - Errors with stack trace

---

## Auto-Reconnect Feature

Service automatically reconnects camera if it disconnects:

1. **On startup:** Up to 5 retry attempts (2 seconds apart)
2. **During operation:** After 10 consecutive errors, automatic reconnection

**Log example:**
```
[ERROR] Слишком много ошибок получения кадра (10), переподключаем камеру...
[INFO] Попытка переподключения камеры...
[INFO] RealSense pipeline запущен 640x480@15
[INFO] Камера успешно переподключена
```

---

## Testing

### Test Camera

```bash
lsusb | grep Intel  # Should show RealSense device
realsense-viewer    # GUI viewer
```

### Test HTTP Endpoints

```bash
# Status
curl http://localhost:8080/status | jq .

# Snapshot
curl http://localhost:8080/snapshot -o test.jpg

# Detect
curl -X POST http://localhost:8080/detect | jq .
```

### Test Cloud Connection

Check logs for successful submission:
```bash
grep "Детекция отправлена" logs/yolo_detect.log
```

---

## Next Steps

- [API Reference](API.md) - Learn about all endpoints
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- Configure dashboard in `/home/MegTech/Desktop/wall-e-flora-vision/.env`
