#!/usr/bin/env python3
"""
Complete integration example: YOLO Detection + Auto-send to Lovable Cloud
"""

import os
import cv2
import numpy as np
import pyrealsense2 as rs
from send_detection import DetectionSender
import time
from datetime import datetime

# Configuration from environment
API_KEY = os.getenv("RASPBERRY_PI_API_KEY", "your-api-key-here")
DEVICE_ID = os.getenv("RASPBERRY_PI_DEVICE_ID", "raspi-001")
ENDPOINT = os.getenv("RASPBERRY_PI_ENDPOINT", 
                    "https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection")

# YOLO Model Configuration (example - adjust to your model)
YOLO_MODEL_PATH = "models/yolov8n.pt"  # Path to your trained model
CONFIDENCE_THRESHOLD = 0.5

# Initialize Detection Sender
sender = DetectionSender(
    api_key=API_KEY,
    device_id=DEVICE_ID,
    endpoint=ENDPOINT
)

# Configure RealSense Camera
pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)
config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)

# Start camera
print(f"[{DEVICE_ID}] Starting RealSense camera...")
pipeline.start(config)

# Load YOLO model (example with ultralytics)
try:
    from ultralytics import YOLO
    model = YOLO(YOLO_MODEL_PATH)
    print(f"[{DEVICE_ID}] YOLO model loaded successfully")
except Exception as e:
    print(f"[{DEVICE_ID}] Error loading YOLO model: {e}")
    print("Install with: pip install ultralytics")
    exit(1)

# Detection loop
print(f"[{DEVICE_ID}] Starting detection loop...")
detection_count = 0

try:
    while True:
        # Capture frame
        frames = pipeline.wait_for_frames()
        color_frame = frames.get_color_frame()
        
        if not color_frame:
            continue
        
        # Convert to numpy array
        color_image = np.asanyarray(color_frame.get_data())
        
        # Run YOLO detection
        results = model(color_image, conf=CONFIDENCE_THRESHOLD)
        
        # Check if any objects detected
        if len(results[0].boxes) > 0:
            detection_count += 1
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Save main image
            main_image_path = f"/tmp/detection_{timestamp}_main.jpg"
            cv2.imwrite(main_image_path, color_image)
            
            # Analyze detection results
            status = "noObjects"
            max_confidence = 0
            plant_images = []
            
            for idx, box in enumerate(results[0].boxes):
                confidence = float(box.conf[0])
                max_confidence = max(max_confidence, confidence)
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                
                # Determine status based on your class names
                if "healthy" in class_name.lower():
                    status = "healthy" if status == "noObjects" else "mixed"
                elif "disease" in class_name.lower() or "mold" in class_name.lower():
                    status = "diseased" if status == "noObjects" else "mixed"
                
                # Extract crop of detected plant
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                crop = color_image[y1:y2, x1:x2]
                
                if crop.size > 0 and len(plant_images) < 3:
                    crop_path = f"/tmp/detection_{timestamp}_plant_{idx}.jpg"
                    cv2.imwrite(crop_path, crop)
                    plant_images.append(crop_path)
            
            # Prepare metadata
            metadata = {
                "detection_count": detection_count,
                "timestamp": timestamp,
                "num_detections": len(results[0].boxes),
                "model": "yolov8n"
            }
            
            # Optional: Add sensor data if available
            try:
                # Example: Add temperature/humidity from a sensor
                # import board
                # import adafruit_dht
                # dht_device = adafruit_dht.DHT22(board.D4)
                # metadata["temperature"] = dht_device.temperature
                # metadata["humidity"] = dht_device.humidity
                pass
            except:
                pass
            
            # Send detection to Lovable Cloud
            print(f"[{DEVICE_ID}] Sending detection #{detection_count}: {status} (confidence: {max_confidence:.2f})")
            
            try:
                response = sender.send_detection(
                    main_image_path=main_image_path,
                    status=status,
                    confidence=round(max_confidence * 100, 2),
                    plant_image_paths=plant_images,
                    metadata=metadata
                )
                
                print(f"[{DEVICE_ID}] ✓ Detection sent successfully!")
                print(f"[{DEVICE_ID}] Response: {response}")
                
                # Cleanup temp files
                os.remove(main_image_path)
                for img_path in plant_images:
                    os.remove(img_path)
                    
            except Exception as e:
                print(f"[{DEVICE_ID}] ✗ Error sending detection: {e}")
        
        # Small delay to avoid overwhelming the system
        time.sleep(0.1)

except KeyboardInterrupt:
    print(f"\n[{DEVICE_ID}] Stopping detection loop...")
finally:
    pipeline.stop()
    print(f"[{DEVICE_ID}] Camera stopped. Total detections: {detection_count}")
