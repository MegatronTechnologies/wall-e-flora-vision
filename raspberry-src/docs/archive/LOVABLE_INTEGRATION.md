# Raspberry Pi → Lovable.dev Integration Guide

## Məqsəd
Lovable.dev app-ından Raspberry Pi-dəki YOLO detection sistemini idarə etmək və real-vaxt deteksiya nəticələrini almaq.

---

## Raspberry Pi API Endpoints

Raspberry Pi `yolo_detect.py` servisi aşağıdakı HTTP endpoint-ləri təqdim edir:

### 1. **GET /snapshot** - Canlı video frame
**Məqsəd:** Canlı kamera görüntüsünü JPEG formatında almaq (Scan button üçün).

```bash
GET http://<raspberry-pi-ip>:8080/snapshot
```

**Response:**
- Content-Type: `image/jpeg`
- Binary JPEG image

**App-da istifadə:**
```typescript
// Scan button handler
const handleScan = () => {
  const streamUrl = `${import.meta.env.VITE_PI_STREAM_URL}/snapshot`;
  // Auto-refresh ilə img tag-da göstər və ya MJPEG stream kimi
  setVideoSource(streamUrl);
};
```

---

### 2. **GET /status** - Sistem statusu
**Məqsəd:** Hazırki deteksiya məlumatları və sistem metrikləri.

```bash
GET http://<raspberry-pi-ip>:8080/status
```

**Response JSON:**
```json
{
  "deviceId": "raspi-001",
  "status": "healthy",           // "healthy" | "diseased" | "mixed" | "noObjects"
  "confidence": 87.5,             // 0-100 arası əminlik faizi
  "objectCount": 3,               // Aşkar edilən obyekt sayı
  "avgFps": 12.34,                // Orta FPS
  "lastFrameTs": 1729865432.123,  // Son frame unix timestamp
  "lastSendResponse": {...},      // Lovable Cloud cavabı
  "lastSendError": null,          // Xəta varsa mesaj
  "supabaseLastResponse": {...},  // Supabase cavabı
  "supabaseLastError": null,
  "sendInterval": 15,             // Otomatik göndərmə intervalı (saniyə)
  "endpoint": "https://..."       // Cloud endpoint URL
}
```

**App-da istifadə:**
```typescript
// Real-time status polling
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`${VITE_PI_STREAM_URL}/status`);
    const data = await response.json();
    setStatus(data.status);
    setConfidence(data.confidence);
    setObjectCount(data.objectCount);
  }, 2000); // Hər 2 saniyədə

  return () => clearInterval(interval);
}, []);
```

---

### 3. **POST /detect** - Manual deteksiya tetikləmə
**Məqsəd:** "Detect" button basanda dərhal deteksiya işə salıb DB-yə göndərmək.

```bash
POST http://<raspberry-pi-ip>:8080/detect
```

**Request:** Body tələb olunmur (boş POST)

**Response JSON (success):**
```json
{
  "success": true,
  "status": "diseased",           // Deteksiya nəticəsi
  "confidence": 92.3,             // Əminlik faizi
  "objectCount": 2,               // Obyekt sayı
  "timestamp": "2025-10-25T14:30:00Z"  // ISO 8601 format
}
```

**Response JSON (error):**
```json
{
  "success": false,
  "error": "no_frame_available"   // Frame hazır deyil
}
```

**App-da istifadə:**
```typescript
// Detect button handler
const handleDetect = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${import.meta.env.VITE_PI_DETECT_URL}/detect`, {
      method: 'POST',
    });
    const result = await response.json();

    if (result.success) {
      toast.success(`Deteksiya uğurlu: ${result.status} (${result.confidence}%)`);
      // DB avtomatik yenilənəcək (Supabase real-time)
      queryClient.invalidateQueries(['detections']);
    } else {
      toast.error(`Xəta: ${result.error}`);
    }
  } catch (error) {
    toast.error('Raspberry Pi əlaqə xətası');
  } finally {
    setLoading(false);
  }
};
```

---

## Environment Variables (.env)

Lovable.dev layihəsində bu dəyişənləri təyin et:

```bash
# Raspberry Pi API base URL
VITE_PI_STREAM_URL=http://<raspberry-pi-ip>:8080
VITE_PI_DETECT_URL=http://<raspberry-pi-ip>:8080

# Supabase (artıq mövcuddur)
VITE_SUPABASE_URL=https://wmzdgcumvdnqodryhmxs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

**Qlobal şəbəkədən giriş üçün:**
- **ngrok istifadə et:** `ngrok http 8080`
- **Tailscale VPN:** Pi-ni şəbəkəyə qoşul
- **Port forwarding:** Router-də 8080 portunu aç

---

## Lovable.dev-ə Təqdim Ediləcək Prompt

Lovable AI-ya bu məlumatı ver ki, app-da düzəlişlər etsin:

```
Please update the app with the following features:

1. **Scan Button:**
   - When clicked, open a modal/dialog showing live camera feed
   - Use image source: `${VITE_PI_STREAM_URL}/snapshot`
   - Auto-refresh image every 500ms to simulate video stream
   - Add "Close" button to dismiss modal

2. **Detect Button:**
   - When clicked, send POST request to `${VITE_PI_DETECT_URL}/detect`
   - Show loading spinner while waiting
   - On success: Show toast notification with detection result (status, confidence)
   - On error: Show error toast with message
   - After successful detection, refresh the detections table from Supabase

3. **Status Indicator:**
   - Poll `${VITE_PI_STREAM_URL}/status` every 3 seconds
   - Display current status badge: "Healthy" (green), "Diseased" (red), "Mixed" (yellow), "No Objects" (gray)
   - Show confidence percentage and object count
   - Show last update timestamp

4. **Environment Variables:**
   - VITE_PI_STREAM_URL: Raspberry Pi base URL
   - VITE_PI_DETECT_URL: Raspberry Pi base URL (same as above)
   - Ensure these are configurable in .env file

5. **Database Integration:**
   - Detection results are automatically sent to Supabase by Raspberry Pi
   - Use Supabase real-time subscriptions to update detections table automatically
   - Display table with columns: Image, Status, Confidence, Time, Device ID

6. **Error Handling:**
   - If Raspberry Pi is offline, show "Device Offline" status
   - Gracefully handle network errors
   - Show retry button if request fails

Please implement these features using existing UI components (shadcn-ui).
Use React Query for API calls and Supabase real-time for database updates.
```

---

## Xüsusiyyətlər (Disease Status Mapping)

Raspberry Pi 4 status qaytarır:

| Status | Məna | UI Göstəriş |
|--------|------|------------|
| `healthy` | Sağlam bitki (yalnız xrizantema) | 🟢 Sağlam |
| `diseased` | Xəstə (mealybug aşkar edildi) | 🔴 Xəstə |
| `mixed` | Qarışıq (həm xrizantema, həm mealybug) | 🟡 Qarışıq |
| `noObjects` | Obyekt tapılmadı | ⚪ Obyekt yoxdur |

---

## Deteksiya Prosesi (Backend)

Raspberry Pi servisi:
1. ✅ Avtomatik olaraq hər 15 saniyədə deteksiya göndərir (ENV ilə konfiqurasiya olunur)
2. ✅ Manuel `/detect` endpoint-i ilə dərhal deteksiya göndərir
3. ✅ Hər deteksiyada:
   - Base64 JPEG şəkil
   - Status (healthy/diseased/mixed/noObjects)
   - Confidence (0-100)
   - Metadata (object count, FPS, timestamp)
   - JSON formatında Supabase-ə yazır

---

## Test Nümunələri

### Terminal-dan test et:

```bash
# Snapshot al
curl http://192.168.1.100:8080/snapshot -o test.jpg

# Status yoxla
curl http://192.168.1.100:8080/status

# Deteksiya tetiklə
curl -X POST http://192.168.1.100:8080/detect
```

### Browser-dən test et:
```
http://192.168.1.100:8080/snapshot  → Canlı frame görünəcək
http://192.168.1.100:8080/status    → JSON status
```

---

## Troubleshooting

### ❌ "Device Offline" görünür
- Raspberry Pi işləyir? → `ssh pi@<ip>` ilə yoxla
- Service işləyir? → `ps aux | grep yolo_detect`
- Port açıq? → `curl http://<ip>:8080/status`

### ❌ CORS error (browser-də)
Raspberry Pi servisi CORS dəstəkləmirsə, Lovable-da proxy yarat və ya Pi-də Flask CORS əlavə et:
```python
from flask_cors import CORS
CORS(app)
```

### ❌ Deteksiya DB-yə yazılmır
- Raspberry Pi environment variable-ları yoxla: `RASPBERRY_PI_API_KEY`, `SUPABASE_ANON_KEY`
- `/status` endpoint-də `lastSendError` yoxla
- Supabase edge function deploy olunub? → `supabase functions list`

---

## Nəticə

✅ Raspberry Pi API hazırdır (`/snapshot`, `/status`, `/detect`)
✅ Lovable.dev-ə yuxarıdakı promptu ver
✅ Environment variable-ları .env-də təyin et
✅ AI app-da button-ları və real-time updates-i tətbiq edəcək

**Növbəti addım:** Lovable.dev-də yuxarıdakı promptu yapışdır və "Generate" bas! 🚀
