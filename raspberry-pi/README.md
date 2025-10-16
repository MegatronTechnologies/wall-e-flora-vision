# Raspberry Pi inteqrasiyası (qısa bələdçi)

Bu sənəd Pi cihazından Lovable (Supabase) backend-inə aşkarlama nəticəsi ötürmək üçün minimal addımları və lazım olan skript nümunəsini bir yerdə cəmləyir.

## 1. Əsas tələblər
- Raspberry Pi 4 (≥4 GB) və Raspbian/Raspberry Pi OS (64-bit)
- Python 3.8+, `pip`, `requests`, `Pillow`, `pyrealsense2`, `opencv-python`
- Ultralytics YOLO (YOLOv8 nano tövsiyə olunur): `pip install ultralytics`
- İntel RealSense D435 (və ya alternativ kamera)

## 2. Mühit dəyişənləri
`~/.plant_detection_config` və ya `.bashrc` içində saxlayın, sonra `source` edin.

```bash
export RASPBERRY_PI_DEVICE_ID="raspi-001"
export RASPBERRY_PI_API_KEY="PI_UCHUN_TƏYİN_ETDİYİNİZ_GİZLİ_AÇAR"
export SUPABASE_ANON_KEY="Supabase Settings → API → Project API keys bölməsindəki anon açar"
export RASPBERRY_PI_ENDPOINT="https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection"
```

## 3. Aşkarlama göndərən skript (copy & paste)
Faylı (məsələn, `send_detection.py`) yaratmağınız üçün minimal nümunə:

```python
#!/usr/bin/env python3
import argparse, base64, json, os, requests

DEFAULT_ENDPOINT = os.getenv("RASPBERRY_PI_ENDPOINT", "https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection")

def encode(path: str) -> str:
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode("utf-8")

def send_detection(main_image: str, status: str, confidence: float | None, plant_images: list[str], metadata: dict | None):
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    device_key = os.getenv("RASPBERRY_PI_API_KEY")
    device_id = os.getenv("RASPBERRY_PI_DEVICE_ID")
    if not supabase_key or not device_key or not device_id:
        raise RuntimeError("SUPABASE_ANON_KEY, RASPBERRY_PI_API_KEY, RASPBERRY_PI_DEVICE_ID mühitdə tapılmadı")

    payload = {
        "device_id": device_id,
        "main_image": encode(main_image),
        "status": status,
    }
    if confidence is not None:
        payload["confidence"] = confidence
    if plant_images:
        payload["plant_images"] = [encode(path) for path in plant_images[:3]]
    if metadata:
        payload["metadata"] = metadata

    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key,
        "X-Raspberry-Pi-Key": device_key,
        "Content-Type": "application/json",
    }

    resp = requests.post(DEFAULT_ENDPOINT, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()

def cli():
    parser = argparse.ArgumentParser(description="Raspberry Pi → Supabase aşkarlama göndərişi")
    parser.add_argument("--main-image", required=True, help="Əsas şəkil faylı")
    parser.add_argument("--status", required=True, choices=["noObjects", "healthy", "diseased", "mixed"])
    parser.add_argument("--confidence", type=float, help="0-100 arası etibarlılıq")
    parser.add_argument("--plant-images", nargs="*", help="Əlavə bitki şəkilləri (max 3)")
    parser.add_argument("--temperature", type=float)
    parser.add_argument("--humidity", type=float)
    args = parser.parse_args()

    metadata = {}
    if args.temperature is not None:
        metadata["temperature"] = args.temperature
    if args.humidity is not None:
        metadata["humidity"] = args.humidity
    if not metadata:
        metadata = None

    result = send_detection(
        main_image=args.main_image,
        status=args.status,
        confidence=args.confidence,
        plant_images=args.plant_images or [],
        metadata=metadata,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    cli()
```

## 4. Tez test
```bash
python3 send_detection.py \
  --main-image sample.jpg \
  --status diseased \
  --confidence 82.5 \
  --temperature 23.1
```

Uğurlu cavab JSON olaraq çap edilir (`detection_id` daxil).

## 5. YOLO ilə inteqrasiya (xülasə)
- `DetectionSender` istifadə edin: mərhələlər — kadrı saxla, statusu təyin et, `send_detection` funksiyasını çağır.
- Əgər ardıcıl loop qurursunuzsa, 2 saniyəlik gecikmə və ya yalnız status dəyişəndə göndəriş tövsiyə olunur.
- `confidence` dəyərini model çıxışından `probability*100` kimi göndərin.

## 6. Stream/snapshot (istəyə bağlı)
- MJPEG (`mjpg-streamer`) və ya sadə Flask serveri ilə `http://PI_IP:8080/?action=snapshot` ünvanını ayarlayın.
- Dashboard-da `VITE_STREAM_URL` dəyərini bu URL ilə yeniləyin.

## 7. Troubleshooting
- `401/403` → Supabase anon açarı və Pi API açarını yoxlayın.
- `429` → `RASPBERRY_PI_RATE_LIMIT_PER_MINUTE` dəyərini Supabase-də artırın və ya göndəriş tezliyini azaldın.
- Şəkil yükləmə xətası → fayl yolunu və ölçüsünü (15 MB limit) yoxlayın.

Bu sənəddəki məzmun Raspberry Pi inteqrasiyasını tez başlatmaq üçün kifayət edir; əlavə ağırlıqda detala ehtiyac olduqda istənilə bilər.
