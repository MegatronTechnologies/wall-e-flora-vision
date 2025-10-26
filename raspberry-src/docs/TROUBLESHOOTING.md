# Troubleshooting

Common issues and solutions for Raspberry Pi detection service.

---

## Camera Issues

### ❌ Camera Not Detected

**Symptoms:**
```
[ERROR] Failed to start RealSense pipeline after retries
```

**Check:**
```bash
# Verify USB connection
lsusb | grep Intel

# Should show something like:
# Bus 001 Device 004: ID 8086:0b3a Intel Corp. RealSense D435
```

**Solutions:**
1. Reconnect USB cable
2. Use different USB port (preferably USB 3.0)
3. Check cable quality (some cables are power-only)
4. Reboot Raspberry Pi
5. Reinstall librealsense: `sudo apt install --reinstall librealsense2-dkms`

---

### ⚠️ Camera Keeps Disconnecting

**Symptoms:**
```
[ERROR] Слишком много ошибок подряд, переподключаем камеру...
```

**Solutions:**
1. **Power issue:** Use powered USB hub (RealSense needs stable 5V)
2. **Cable quality:** Replace with high-quality USB 3.0 cable
3. **Firmware:** Update RealSense firmware via `realsense-viewer`
4. Check `dmesg` for USB errors: `dmesg | grep -i usb`

---

## Network Issues

### ❌ 401 Unauthorized from Supabase

**Symptoms:**
```
[ERROR] Ошибка отправки детекции: 401 Client Error: Unauthorized
```

**Check:**
```bash
# Verify environment variables
echo $RASPBERRY_PI_API_KEY
echo $SUPABASE_ANON_KEY
```

**Solutions:**
1. Check `RASPBERRY_PI_API_KEY` matches Supabase secret
2. Verify `SUPABASE_ANON_KEY` is correct (from Supabase Settings → API)
3. Ensure edge function `submit-detection` is deployed:
   ```bash
   cd /home/MegTech/Desktop/wall-e-flora-vision
   supabase functions deploy submit-detection
   ```

---

### ❌ Connection Timeout

**Symptoms:**
```
[WARN] Supabase insert failed: Connection timeout
```

**Check network:**
```bash
ping google.com
ping wmzdgcumvdnqodryhmxs.supabase.co
```

**Solutions:**
1. Check internet connection
2. Verify firewall settings
3. Increase timeout in code (default: 30 seconds)

---

## Performance Issues

### 🐌 Low FPS (<5 FPS)

**Symptoms:**
```
[DEBUG] Frame processed: fps=3.42
```

**Solutions:**
1. **Lower resolution:**
   ```bash
   export RS_FRAME_WIDTH=320
   export RS_FRAME_HEIGHT=240
   ```

2. **Lower frame rate:**
   ```bash
   export RS_FRAME_RATE=10
   ```

3. **Use NCNN model:** Already using `best_ncnn_model` (optimized)

4. **Check CPU usage:**
   ```bash
   htop  # Should be <80% on all cores
   ```

---

### 🔥 Raspberry Pi Overheating

**Check temperature:**
```bash
vcgencmd measure_temp
```

**Solutions:**
- Add heatsinks
- Improve ventilation
- Reduce camera resolution/FPS
- Consider active cooling (fan)

---

## Service Issues

### ❌ Service Won't Start

**Check logs:**
```bash
tail -50 logs/yolo_detect.log
```

**Common causes:**

1. **Missing dependencies:**
   ```bash
   pip list | grep -E "ultralytics|pyrealsense2|flask|requests"
   ```

2. **Model not found:**
   ```bash
   ls -la best_ncnn_model/
   ```

3. **Permission issues:**
   ```bash
   chmod +x yolo_detect.py
   ```

---

### ❌ HTTP Endpoints Not Responding

**Check if service is running:**
```bash
ps aux | grep yolo_detect
```

**Check port:**
```bash
netstat -tuln | grep 8080
```

**Test from Pi itself:**
```bash
curl http://localhost:8080/status
```

---

## Dashboard Issues

### ❌ Dashboard Shows "Device Offline"

**Check from dashboard host:**
```bash
# Ping Raspberry Pi
ping 192.168.1.100

# Test endpoint
curl http://192.168.1.100:8080/status
```

**Solutions:**
1. Verify Pi IP address hasn't changed
2. Update `.env` in dashboard:
   ```
   VITE_PI_STREAM_URL=http://192.168.1.100:8080
   ```
3. Check firewall on Pi:
   ```bash
   sudo ufw status
   sudo ufw allow 8080
   ```

---

### ❌ CORS Errors in Browser

**Symptoms:**
```
Access to fetch at 'http://192.168.1.100:8080/status' has been blocked by CORS policy
```

**Solution:** Use Supabase pi-proxy edge function (already implemented):
```typescript
// Instead of direct access
fetch(`http://192.168.1.100:8080/status`)

// Use proxy
fetch(`${VITE_SUPABASE_URL}/functions/v1/pi-proxy?endpoint=/status`)
```

---

## Log Analysis

### Find errors in last session:
```bash
grep ERROR logs/yolo_detect.log
```

### Check reconnection events:
```bash
grep "переподключена" logs/yolo_detect.log
```

### Count successful detections:
```bash
grep "Детекция отправлена" logs/yolo_detect.log | wc -l
```

---

## Still Having Issues?

1. **Check full logs:** `cat logs/yolo_detect.log`
2. **Verify hardware:** `realsense-viewer`
3. **Test network:** `curl` endpoints manually
4. **Review configuration:** `cat pi-env.sh`

For more details, see [Setup Guide](SETUP.md) or archived docs in `docs/archive/`.
