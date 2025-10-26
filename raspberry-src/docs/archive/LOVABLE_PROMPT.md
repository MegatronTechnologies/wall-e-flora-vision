# Lovable.dev AI Prompt - Raspberry Pi Integration

Copy and paste this prompt directly into Lovable.dev:

---

## Prompt for Lovable AI

```
I need to integrate my Raspberry Pi plant disease detection system with this web app. The Pi runs a YOLO detection service that provides REST API endpoints.

RASPBERRY PI API ENDPOINTS:

1. GET /snapshot
   - Returns: JPEG image (latest camera frame)
   - Use for: Live video feed display
   - Content-Type: image/jpeg

2. GET /status
   - Returns JSON:
     {
       "deviceId": "raspi-001",
       "status": "healthy" | "diseased" | "mixed" | "noObjects",
       "confidence": 87.5,
       "objectCount": 3,
       "avgFps": 12.34,
       "lastFrameTs": 1729865432.123
     }
   - Use for: Real-time status display

3. POST /detect
   - Request: Empty POST body
   - Returns JSON:
     {
       "success": true,
       "status": "diseased",
       "confidence": 92.3,
       "objectCount": 2,
       "timestamp": "2025-10-25T14:30:00Z"
     }
   - Use for: Manual detection trigger (Detect button)
   - Note: Detection result automatically saves to Supabase

ENVIRONMENT VARIABLES NEEDED:
- VITE_PI_STREAM_URL (example: http://192.168.1.100:8080)
- VITE_PI_DETECT_URL (same as above)
- VITE_SUPABASE_URL (already configured)
- VITE_SUPABASE_PUBLISHABLE_KEY (already configured)

FEATURES TO IMPLEMENT:

1. SCAN BUTTON:
   - Click to open modal showing live camera feed
   - Display image from ${VITE_PI_STREAM_URL}/snapshot
   - Auto-refresh every 500ms for live effect
   - Add close button

2. DETECT BUTTON:
   - Click to send POST to ${VITE_PI_DETECT_URL}/detect
   - Show loading spinner
   - On success: Show toast "Detection successful: {status} ({confidence}%)"
   - On error: Show toast "Connection error"
   - Refresh detections table after success

3. STATUS INDICATOR:
   - Poll ${VITE_PI_STREAM_URL}/status every 3 seconds
   - Display status badge:
     * "healthy" → Green badge "Healthy"
     * "diseased" → Red badge "Diseased"
     * "mixed" → Yellow badge "Mixed"
     * "noObjects" → Gray badge "No Objects"
   - Show confidence percentage
   - Show object count
   - Show last update time

4. DETECTIONS TABLE:
   - Use Supabase real-time subscriptions
   - Auto-update when new detection arrives
   - Columns: Image, Status, Confidence, Time, Device ID
   - Filter by device ID and date range

5. ERROR HANDLING:
   - If Pi offline, show "Device Offline" badge
   - Retry button on network errors
   - Graceful fallback if API unavailable

STATUS COLOR MAPPING:
- healthy → green-500
- diseased → red-500
- mixed → yellow-500
- noObjects → gray-400

Use existing shadcn-ui components, React Query for API calls, and Supabase client for database updates.

The Raspberry Pi automatically sends detections to Supabase every 15 seconds, and also immediately when POST /detect is called. The app just needs to display this data and provide manual trigger capability.
```

---

## Quick Setup Steps

1. **Lovable.dev-də:**
   - Yuxarıdakı promptu kopyala və yapışdır
   - "Generate" düyməsini bas
   - Gözlə ki, AI kodu yazsın

2. **Environment Variables əlavə et:**
   ```
   VITE_PI_STREAM_URL=http://<raspberry-pi-ip>:8080
   VITE_PI_DETECT_URL=http://<raspberry-pi-ip>:8080
   ```

3. **Test et:**
   - Scan button basanda modal açılmalı
   - Detect button basanda deteksiya işləməli
   - Status badge real-time yenilənməli

4. **Qlobal giriş üçün (optional):**
   ```bash
   # Raspberry Pi-də ngrok quraşdır
   ngrok http 8080

   # Alınan URL-i .env-ə əlavə et
   VITE_PI_STREAM_URL=https://abc123.ngrok.io
   ```

---

## Raspberry Pi Hazırlığı

Raspberry Pi-də service işləməlidir:

```bash
cd Desktop/megtech
source pi-env.sh  # Environment variables yüklə
python3 yolo_detect.py
```

Service işləyəndə görərsən:
```
[INFO] RealSense pipeline запущен 640x480@15
[INFO] HTTP сервер слушает 0.0.0.0:8080
```

---

## API Test

Raspberry Pi ilə əlaqə test et:

```bash
# Status yoxla
curl http://<raspberry-pi-ip>:8080/status

# Snapshot al
curl http://<raspberry-pi-ip>:8080/snapshot -o test.jpg

# Deteksiya tetiklə
curl -X POST http://<raspberry-pi-ip>:8080/detect
```

Əgər cavab alırsan, deməki API işləyir! ✅

---

## Supabase Table Structure (Reference)

Raspberry Pi avtomatik olaraq bu strukturda data göndərir:

```sql
-- detections table
id              uuid
device_id       text
status          text  -- 'healthy' | 'diseased' | 'mixed' | 'noObjects'
confidence      numeric
image_url       text
metadata        jsonb  -- {objectCount, avgFps, captured_at, diseaseName}
created_at      timestamp
```

---

## Expected Result

App-da görməli olduğun:

1. ✅ **Dashboard:**
   - Real-time status badge (yaşıl/qırmızı/sarı)
   - Confidence faizi
   - Obyekt sayı
   - Son yeniləmə vaxtı

2. ✅ **Scan Button:**
   - Modal açılır
   - Canlı kamera görüntüsü görünür
   - Hər yarım saniyədə yenilənir

3. ✅ **Detect Button:**
   - Loading spinner
   - Uğurlu olduqda toast notification
   - Cədvəl avtomatik yenilənir

4. ✅ **Detections Table:**
   - Şəkillər
   - Status (rəngli badge)
   - Confidence
   - Zaman
   - Real-time update

---

## Troubleshooting

**❌ CORS Error:**
```bash
# Raspberry Pi-də Flask CORS əlavə et
pip3 install flask-cors

# yolo_detect.py-də:
from flask_cors import CORS
CORS(app)
```

**❌ Connection Refused:**
- Raspberry Pi işləyir? SSH ilə yoxla
- Firewall bloklamır? `sudo ufw allow 8080`
- Düzgün IP? `hostname -I` ilə yoxla

**❌ Detections DB-yə yazılmır:**
- ENV variable-lar düzgün? `echo $RASPBERRY_PI_API_KEY`
- Supabase edge function deploy olunub?
- `/status` endpoint-də error yoxla

---

Hazır! Lovable.dev-ə promptu ver və nəticəni gözlə! 🚀
