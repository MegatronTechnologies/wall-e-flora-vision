#!/usr/bin/env python3
"""
Raspberry Pi Detection Sender
This script sends mold detection data to Lovable Cloud backend.

Requirements:
  pip install requests Pillow

Usage:
  python send_detection.py --device-id raspi-001 --api-key YOUR_API_KEY
"""

import requests
import base64
import json
import argparse
from pathlib import Path
from typing import Optional, List, Dict, Any

class DetectionSender:
    def __init__(self, api_key: str, device_id: str, endpoint: str):
        """
        Initialize the Detection Sender
        
        Args:
            api_key: API key for authentication
            device_id: Unique identifier for this Raspberry Pi
            endpoint: Edge function endpoint URL
        """
        self.api_key = api_key
        self.device_id = device_id
        self.endpoint = endpoint
        
    def encode_image(self, image_path: str) -> str:
        """
        Encode an image file to base64 string
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Base64 encoded string
        """
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def send_detection(
        self,
        main_image_path: str,
        status: str,
        confidence: Optional[float] = None,
        plant_image_paths: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send detection data to the backend
        
        Args:
            main_image_path: Path to main detection image
            status: Detection status ('noObjects', 'healthy', 'diseased', 'mixed')
            confidence: Detection confidence (0-100)
            plant_image_paths: List of paths to plant detail images (max 3)
            metadata: Additional metadata (temperature, humidity, etc.)
            
        Returns:
            Response data from the server
        """
        # Validate status
        valid_statuses = ['noObjects', 'healthy', 'diseased', 'mixed']
        if status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        
        # Encode main image
        main_image_b64 = self.encode_image(main_image_path)
        
        # Prepare request payload
        payload = {
            'device_id': self.device_id,
            'main_image': main_image_b64,
            'status': status,
        }
        
        # Add optional fields
        if confidence is not None:
            if not 0 <= confidence <= 100:
                raise ValueError("Confidence must be between 0 and 100")
            payload['confidence'] = confidence
        
        # Encode plant images if provided
        if plant_image_paths:
            plant_images_b64 = []
            for path in plant_image_paths[:3]:  # Max 3 images
                plant_images_b64.append(self.encode_image(path))
            payload['plant_images'] = plant_images_b64
        
        # Add metadata if provided
        if metadata:
            payload['metadata'] = metadata
        
        # Send request
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        print(f"Sending detection from {self.device_id}...")
        print(f"Status: {status}, Confidence: {confidence}%")
        
        try:
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            response.raise_for_status()
            
            result = response.json()
            print(f"✓ Success! Detection ID: {result.get('detection_id')}")
            return result
            
        except requests.exceptions.RequestException as e:
            print(f"✗ Error sending detection: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            raise


def main():
    parser = argparse.ArgumentParser(description='Send detection data to Lovable Cloud')
    parser.add_argument('--device-id', required=True, help='Raspberry Pi device ID')
    parser.add_argument('--api-key', required=True, help='API key for authentication')
    parser.add_argument('--endpoint', 
                       default='https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection',
                       help='Edge function endpoint URL')
    parser.add_argument('--main-image', required=True, help='Path to main detection image')
    parser.add_argument('--status', required=True, 
                       choices=['noObjects', 'healthy', 'diseased', 'mixed'],
                       help='Detection status')
    parser.add_argument('--confidence', type=float, help='Detection confidence (0-100)')
    parser.add_argument('--plant-images', nargs='*', help='Paths to plant detail images (max 3)')
    parser.add_argument('--temperature', type=float, help='Temperature reading')
    parser.add_argument('--humidity', type=float, help='Humidity reading')
    
    args = parser.parse_args()
    
    # Prepare metadata
    metadata = {}
    if args.temperature is not None:
        metadata['temperature'] = args.temperature
    if args.humidity is not None:
        metadata['humidity'] = args.humidity
    
    # Create sender and send detection
    sender = DetectionSender(
        api_key=args.api_key,
        device_id=args.device_id,
        endpoint=args.endpoint
    )
    
    result = sender.send_detection(
        main_image_path=args.main_image,
        status=args.status,
        confidence=args.confidence,
        plant_image_paths=args.plant_images,
        metadata=metadata if metadata else None
    )
    
    print(f"\nFull response: {json.dumps(result, indent=2)}")


if __name__ == '__main__':
    main()
