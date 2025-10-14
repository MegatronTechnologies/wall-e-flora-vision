# Raspberry Pi Setup Guide

## Prerequisites

### Hardware
- Raspberry Pi 4 (4GB+ RAM recommended)
- Intel RealSense Depth Camera D435 or similar
- MicroSD card (32GB+)
- Power supply
- Network connection (WiFi or Ethernet)

### Software
- Raspberry Pi OS (64-bit recommended)
- Python 3.8+

---

## Step 1: Initial Raspberry Pi Setup

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Python dependencies
sudo apt-get install python3-pip python3-dev -y

# Install OpenCV dependencies
sudo apt-get install libopencv-dev python3-opencv -y
```

---

## Step 2: Install RealSense SDK

```bash
# Register Intel's server key
sudo mkdir -p /etc/apt/keyrings
curl -sSf https://librealsense.intel.com/Debian/librealsense.pgp | sudo tee /etc/apt/keyrings/librealsense.pgp > /dev/null

# Add the server to repository list
echo "deb [signed-by=/etc/apt/keyrings/librealsense.pgp] https://librealsense.intel.com/Debian/apt-repo `lsb_release -cs` main" | sudo tee /etc/apt/sources.list.d/librealsense.list

# Install libraries
sudo apt-get update
sudo apt-get install librealsense2-dkms librealsense2-utils librealsense2-dev -y

# Install Python bindings
pip3 install pyrealsense2
```

### Test RealSense Camera
```bash
realsense-viewer
```

---

## Step 3: Install YOLO and Dependencies

```bash
# Install PyTorch (CPU version for Pi)
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install Ultralytics YOLOv8
pip3 install ultralytics

# Install additional dependencies
pip3 install opencv-python numpy requests pillow
```

---

## Step 4: Configure Environment Variables

Create a `.env` file or export variables:

```bash
# Create config file
nano ~/.plant_detection_config

# Add these lines:
export RASPBERRY_PI_API_KEY="your-actual-api-key-from-lovable"
export RASPBERRY_PI_DEVICE_ID="raspi-001"
export RASPBERRY_PI_ENDPOINT="https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection"

# Load on startup
echo "source ~/.plant_detection_config" >> ~/.bashrc
source ~/.bashrc
```

### Get API Key from Lovable Dashboard:
1. Open your Lovable project
2. Go to Backend → Secrets
3. Find `RASPBERRY_PI_API_KEY` value
4. Copy and paste into config above

---

## Step 5: Setup Project Files

```bash
# Create project directory
mkdir -p ~/plant-detection
cd ~/plant-detection

# Copy files from this repository
# - send_detection.py
# - integration_example.py
# - stream_config.md

# Download your trained YOLO model
mkdir models
# Copy your trained .pt model file to models/
```

---

## Step 6: Test Detection Script

### Test API connection first:
```bash
# Take a test photo
raspistill -o test_image.jpg

# Test sending detection
python3 send_detection.py \
  --main-image test_image.jpg \
  --status healthy \
  --confidence 95.5
```

Expected output:
```
Detection sent successfully!
Response: {'success': True, 'detection_id': '...', 'message': 'Detection saved successfully'}
```

---

## Step 7: Setup Stream Server (Optional)

### Option A: MJPEG Stream
```bash
# Install mjpg-streamer
sudo apt-get install cmake libjpeg8-dev -y
git clone https://github.com/jacksonliam/mjpg-streamer.git
cd mjpg-streamer/mjpg-streamer-experimental
make
sudo make install

# Start stream
mjpg_streamer -i "input_opencv.so -r 640x480 -fps 15" -o "output_http.so -p 8080"
```

### Option B: Flask Snapshot Server
```bash
pip3 install flask flask-cors

# Run simple_stream.py (if using snapshot mode)
python3 simple_stream.py
```

---

## Step 8: Run Full Integration

```bash
# Run the complete detection + auto-send script
python3 integration_example.py
```

You should see:
```
[raspi-001] Starting RealSense camera...
[raspi-001] YOLO model loaded successfully
[raspi-001] Starting detection loop...
[raspi-001] Sending detection #1: diseased (confidence: 0.87)
[raspi-001] ✓ Detection sent successfully!
```

---

## Step 9: Setup Autostart (Optional)

To run detection on boot:

```bash
# Create systemd service
sudo nano /etc/systemd/system/plant-detection.service
```

Add:
```ini
[Unit]
Description=Plant Disease Detection Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/plant-detection
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/python3 /home/pi/plant-detection/integration_example.py
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

## Troubleshooting

### Camera not detected
```bash
# Check USB connections
lsusb | grep Intel

# Test with realsense-viewer
realsense-viewer
```

### API connection fails
```bash
# Test network
ping google.com

# Test endpoint
curl -X POST https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","main_image":"test","status":"healthy"}'
```

### YOLO model too slow
- Use a smaller model (YOLOv8n instead of YOLOv8x)
- Reduce input resolution
- Consider using Coral TPU accelerator

### Out of memory
```bash
# Increase swap
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

---

## Performance Optimization

### 1. Use lightweight YOLO model
```python
model = YOLO('yolov8n.pt')  # nano version
```

### 2. Reduce frame rate
```python
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 15)  # 15fps instead of 30
```

### 3. Process every Nth frame
```python
frame_count = 0
if frame_count % 5 == 0:  # Process every 5th frame
    results = model(color_image)
frame_count += 1
```

---

## Network Configuration

### Local Network Access
Dashboard and Pi on same network - just use Pi's local IP:
```
VITE_STREAM_URL=http://192.168.1.100:8080/?action=snapshot
```

### Remote Access (ngrok)
```bash
# Install ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
tar xvzf ngrok-v3-stable-linux-arm64.tgz
sudo mv ngrok /usr/local/bin/

# Start tunnel
ngrok http 8080

# Use the provided URL in dashboard
# Example: https://abc123.ngrok.io/?action=snapshot
```

---

## Ready to Deploy!

Once setup is complete:
1. Raspberry Pi runs detection automatically
2. Detections appear in dashboard in real-time
3. Stream accessible at configured URL
4. All data stored in Lovable Cloud

Check your dashboard at: https://6f57ff6c-8105-4412-aa58-20836cc6cf0a.lovableproject.com
