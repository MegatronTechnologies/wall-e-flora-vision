# Raspberry Pi-dən Lovable Cloud-a Göndəriş

Bu sənəd `raspberry-pi/send_detection.py` skriptindən istifadə edərək Intel RealSense kamerası ilə toplanmış aşkarlama nəticələrini Lovable Cloud (Supabase) backend-inə necə ötürəcəyinizi izah edir.

## 1. Lazımi paketləri qurun

Terminalda Python asılılıqlarını quraşdırın:

```sh
pip install requests Pillow
```

> YOLO modeli və RealSense üçün ayrıca `ultralytics`, `pyrealsense2`, `opencv-python` kimi paketlərin artıq qurulduğunu güman edirik.

## 2. Mühit dəyişənlərini konfiqurasiya edin

API açarı və cihaz identifikatoru Lovable Cloud tərəfindən yaradılır. Raspberry Pi-də bu dəyişənləri `.bashrc`, `.zshrc` və ya ayrıca `.env` faylına əlavə edin:

```sh
export RASPBERRY_PI_DEVICE_ID=raspi-001
export RASPBERRY_PI_API_KEY=D8D72D4D-E3DF-4521-A722-BCEF673B68AE
export RASPBERRY_PI_ENDPOINT=https://wmzdgcumvdnqodryhmxs.supabase.co/functions/v1/submit-detection
```

Terminalı yenidən açın və ya `source ~/.bashrc` (və ya istifadə etdiyiniz shell faylının yolunu) icra edin ki, dəyişənlər aktiv olsun.

## 3. Skripti əl ilə işə salmaq

Əsas şəkil faylını və əlavə metadatanı göndərmək üçün:

```sh
python raspberry-pi/send_detection.py \
  --main-image StreamScan/20241112_123456.png \
  --status healthy \
  --confidence 87.5 \
  --temperature 22.5 \
  --humidity 65 \
  --plant-images StreamFrame/20241112_123456-1.png StreamFrame/20241112_123456-2.png
```

Əgər `--device-id`, `--api-key` və `--endpoint` parametrini verməsəniz, skript yuxarıdakı mühit dəyişənlərini avtomatik oxuyacaq.

### Parametrlərin izahı

- `--main-image` – əsas aşkarlama şəkli (məcburidir).
- `--status` – aşkarlamanın halı (`noObjects`, `healthy`, `diseased`, `mixed`).
- `--confidence` – etibarlılıq faizi (0–100 arası).
- `--plant-images` – ən çox 3 əlavə kiçik bitki şəkli (istəyə bağlı).
- `--temperature`, `--humidity` – əlavə metadata nümunələri (istəyə bağlı).

## 4. Mövcud YOLO skriptinə inteqrasiya

Aşağıdakı nümunə əsas loop-da hər uğurlu aşkarlamadan sonra Lovable Cloud-a sorğu göndərir:

```python
from send_detection import DetectionSender

sender = DetectionSender(
    api_key=os.getenv("RASPBERRY_PI_API_KEY"),
    device_id=os.getenv("RASPBERRY_PI_DEVICE_ID"),
    endpoint=os.getenv("RASPBERRY_PI_ENDPOINT", DEFAULT_ENDPOINT),
)

result = sender.send_detection(
    main_image_path=str(main_frame_path),
    status="diseased",
    confidence=87.5,
    plant_image_paths=[str(img) for img in plant_frames[:3]],
    metadata={"temperature": temperature, "humidity": humidity},
)

print("Lovable cavabı:", result)
```

Öz real dəyişənlərinizi (`status`, `confidence`, metadata və s.) YOLO modelinizin çıxışına uyğun şəkildə doldurun.

## 5. Uğursuz sorğular üçün yoxlama

- Skript **“API açarı tapılmadı”** deyirsə, mühit dəyişənini düzgün yazdığınızdan və terminalın onu oxuduğundan əmin olun.
- HTTP xətası alırsınızsa, Lovable Cloud tərəfində (Supabase Dashboard → Edge Functions → `submit-detection`) log-ları izləyin.
- Şəkil yollarının doğru olduğuna əmin olun; mövcud olmayan fayl üçün skript `FileNotFoundError` qaytaracaq.

## 6. Böyük YOLO skriptində addım-addım dəyişikliklər

Hazırda `raspberry-pi/send_detection.py` ayrı skript kimi işləyir. Aşağıdakı addımları çox kadr işləyən əsas YOLO skriptinizə (RealSense ilə çəkiliş edən fayl) əlavə edin ki, aşkarlama bitən kimi Lovable Cloud-a məlumat getsin:

1. **Import əlavə et**
   ```python
   from send_detection import DetectionSender
   ```

2. **Sender obyektini hazırlayın** (loop başlamazdan əvvəl, məsələn pipeline qurulduqdan sonra):
   ```python
   sender = DetectionSender(
       api_key=os.getenv("RASPBERRY_PI_API_KEY"),
       device_id=os.getenv("RASPBERRY_PI_DEVICE_ID"),
       endpoint=os.getenv("RASPBERRY_PI_ENDPOINT", DEFAULT_ENDPOINT),
   )
   ```

3. **Əsas kadrı saxladıqdan sonra göndərin.** `save_full_frame` və ya `save_frames_from_detections` funksiyasında şəkil saxlandıqdan sonra aşağıdakı bloku yerləşdirin:
   ```python
   detection_metadata = {
       "temperature": current_temperature,
       "humidity": current_humidity,
   }

   try:
       response = sender.send_detection(
           main_image_path=str(saved_frame_path),
           status=detected_status,
           confidence=round(confidence * 100, 2),
           plant_image_paths=[str(path) for path in saved_crop_paths[:3]],
           metadata={k: v for k, v in detection_metadata.items() if v is not None},
       )
       print("Detection Supabase-a göndərildi:", response)
   except Exception as exc:
       print("Göndərmə zamanı xəta baş verdi:", exc)
   ```

4. **Status və confidence** dəyərini modelinizin çıxışından götürün. Məsələn:
   ```python
   if object_count == 0:
       detected_status = "noObjects"
       confidence = 0
   else:
       detected_status = "diseased"  # modeli necə etiketləyirsinizsə uyğunlaşdırın
       confidence = detections[0].conf.item()  # ən yüksək etibarlılıq
   ```

5. **Sensorlardan metadata toplayın.** Əgər temperatur/rütubət sensoru serial və ya I2C ilə bağlıdırsa, əsas loop-da oxuyun və yuxarıda göstərilən `detection_metadata` obyektinə əlavə edin.

## 7. Yenidən göndərmə və loqlaşdırma tövsiyələri

- **Fayla log yazın:** `logging` modulundan istifadə edib həm uğurlu, həm də uğursuz göndərişləri `/var/log/mold-detector.log` kimi faylda saxlayın.
- **Retry mexanizmi:** `send_detection` çağırışı xəta verərsə, şəkil yolunu və metadatanı lokal JSON faylına (məsələn `pending_uploads.json`) yazın. Skript növbəti açılışda həmin faylı oxuyub yenidən göndərə bilər.
- **Rate limitə hörmət:** Edge function hər cihaz üçün dəqiqədə standart olaraq 60 sorğu qəbul edir (`RASPBERRY_PI_RATE_LIMIT_PER_MINUTE`). Kadr tezliyi yüksəkdirsə, yalnız “maraqlı” kadrlarda (məsələn, status dəyişəndə) göndəriş edin.

## 8. Tez-tez verilən suallar

- **“Authorization header yoxdur” xətası gəlir.** — `RASPBERRY_PI_API_KEY` mühit dəyişənini doğru yazdığınıza əmin olun və skripti yenidən başladın.
- **“Rate limit exceeded” cavabı gəlir.** — Göndərişləri bir neçə saniyə dayandırın və yalnız real dəyişik olan kadrlarda sorğu göndərin; lazım olsa `RASPBERRY_PI_RATE_LIMIT_PER_MINUTE` dəyərini Lovable Cloud-da artırın.
- **Şəkil serverdə görünmür.** — Fayl yolunun mövcudluğunu yoxlayın və göndərməzdən əvvəl kamera çarxının yazıldığını təsdiqləyin; base64 çevirmədən əvvəl `os.path.exists(path)` ilə yoxlama aparın.
- **“Edge function is unreachable” xəbərdarlığı görsənir.** — Lovable/Supabase layihənizdə `manage-users` edge funksiyasının deploy olunduğuna və lokal mühitin `VITE_SUPABASE_URL` vasitəsilə həmin hosta çıxışına əmin olun (`supabase functions deploy manage-users`).
- **Dashboard-dakı `Scan`/`Detect` düymələri işləmirsə.** — `VITE_STREAM_URL` (canlı video) və `VITE_PI_DETECT_URL` (deteksiya POST endpoint-i) dəyərlərini `.env` faylında konfiqurasiya edin; Raspberry Pi-də uyğun servis və ya API işləməlidir.

Bu addımları tamamladıqdan sonra Raspberry Pi hər aşkarlama üçün şəkilləri və məlumatları Lovable Cloud-a göndərə biləcək.
