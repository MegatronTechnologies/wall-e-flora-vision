# Raspberry Pi Stream Configuration

## Option 1: MJPEG Stream with mjpg-streamer (Recommended)

### Installation
```bash
sudo apt-get update
sudo apt-get install cmake libjpeg8-dev

git clone https://github.com/jacksonliam/mjpg-streamer.git
cd mjpg-streamer/mjpg-streamer-experimental
make
sudo make install
```

### Start Stream
```bash
# For USB camera
mjpg_streamer -i "input_uv4l.so" -o "output_http.so -w ./www -p 8080"

# For RealSense camera (if supported)
mjpg_streamer -i "input_opencv.so -r 640x480 -fps 15" -o "output_http.so -w ./www -p 8080"
```

### Access Stream
- Snapshot URL: `http://RASPBERRY_PI_IP:8080/?action=snapshot`
- Stream URL: `http://RASPBERRY_PI_IP:8080/?action=stream`

### Environment Variable for Dashboard
```bash
# In your Lovable project, this would be configured via Lovable Cloud settings
VITE_STREAM_URL=http://YOUR_RASPBERRY_PI_IP:8080/?action=snapshot
```

---

## Option 2: Simple HTTP Server with Python (Snapshot Mode)

### Create snapshot server (simple_stream.py):
```python
#!/usr/bin/env python3
from flask import Flask, Response
import pyrealsense2 as rs
import numpy as np
import cv2

app = Flask(__name__)

# Configure RealSense
pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)
pipeline.start(config)

@app.route('/snapshot')
def snapshot():
    frames = pipeline.wait_for_frames()
    color_frame = frames.get_color_frame()
    if not color_frame:
        return "No frame", 503
    
    color_image = np.asanyarray(color_frame.get_data())
    _, buffer = cv2.imencode('.jpg', color_image)
    
    return Response(buffer.tobytes(), mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Install dependencies:
```bash
pip install flask opencv-python pyrealsense2
```

### Run server:
```bash
python3 simple_stream.py
```

### Access:
- Snapshot URL: `http://RASPBERRY_PI_IP:8080/snapshot`

---

## Option 3: WebRTC (Advanced - Real Live Stream)

For true real-time streaming with very low latency, use UV4L WebRTC server:

```bash
curl http://www.linux-projects.org/listing/uv4l_repo/lpkey.asc | sudo apt-key add -
echo "deb http://www.linux-projects.org/listing/uv4l_repo/raspbian/stretch stretch main" | sudo tee /etc/apt/sources.list.d/uv4l.list
sudo apt-get update
sudo apt-get install uv4l uv4l-raspicam uv4l-server uv4l-webrtc
```

Then access via: `http://RASPBERRY_PI_IP:8080/stream`

---

## Network Configuration

### If Dashboard and Raspberry Pi are on different networks:

1. **Port Forwarding on Router**: Forward port 8080 to Raspberry Pi's local IP
2. **Use ngrok** (easier for testing):
   ```bash
   ngrok http 8080
   ```
   Then use the ngrok URL as VITE_STREAM_URL

3. **VPN**: Connect both devices to same VPN (Tailscale, ZeroTier)

### CORS Configuration (if using Flask)
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

---

## Integration with send_detection.py

After detection is triggered, you can optionally save the snapshot:

```python
import requests

# In your YOLO loop
if detection_triggered:
    # Get snapshot
    response = requests.get('http://localhost:8080/snapshot')
    if response.status_code == 200:
        with open('/tmp/snapshot.jpg', 'wb') as f:
            f.write(response.content)
    
    # Send detection
    sender.send_detection(
        main_image_path='/tmp/snapshot.jpg',
        status=detection_status,
        confidence=confidence_score
    )
```

---

## Testing the Stream

```bash
# Test snapshot endpoint
curl http://RASPBERRY_PI_IP:8080/snapshot -o test.jpg

# Or in browser
http://RASPBERRY_PI_IP:8080/snapshot
```

---

## Dashboard Configuration

Once stream is running, configure in your project:

**For Lovable Cloud users:**
The environment variables are managed automatically. The stream URL should be accessible from the browser where the dashboard is viewed.

**Recommended approach:**
Use snapshot mode (`?action=snapshot`) for better compatibility across networks.
