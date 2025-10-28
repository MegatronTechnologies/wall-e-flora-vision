# Обновление Raspberry Pi для работы с авторизацией пользователей

## Что изменилось?

Для улучшения безопасности, все детекции теперь привязываются к конкретным пользователям. Каждый пользователь видит только свои детекции.

## Изменения в коде Raspberry Pi

### 1. Обновите `yolo_detect.py`

Найдите функцию отправки детекций и добавьте поддержку Authorization header:

**Старый код (примерно строка 590-620):**
```python
def _send_detection(self, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not DEVICE_ID:
        return {"error": "RASPBERRY_PI_DEVICE_ID not set"}
    if not API_KEY:
        return {"error": "RASPBERRY_PI_API_KEY not set — не отправляем"}
    if not ENDPOINT:
        return {"error": "RASPBERRY_PI_ENDPOINT not set — не отправляем"}

    headers = {
        "Content-Type": "application/json",
        "X-Raspberry-Pi-Key": API_KEY,
    }
    
    # ... rest of the code
```

**Новый код:**
```python
def _send_detection(self, payload: Dict[str, Any], auth_token: Optional[str] = None) -> Dict[str, Any]:
    if not DEVICE_ID:
        return {"error": "RASPBERRY_PI_DEVICE_ID not set"}
    if not API_KEY:
        return {"error": "RASPBERRY_PI_API_KEY not set — не отправляем"}
    if not ENDPOINT:
        return {"error": "RASPBERRY_PI_ENDPOINT not set — не отправляем"}

    headers = {
        "Content-Type": "application/json",
        "X-Raspberry-Pi-Key": API_KEY,
    }
    
    # Add Authorization header if provided
    if auth_token:
        headers["Authorization"] = auth_token
    
    # ... rest of the code
```

### 2. Обновите Flask endpoint `/detect`

Найдите обработчик `/detect` (примерно строка 750-770) и измените его:

**Старый код:**
```python
@app.route("/detect", methods=["POST"])
def trigger_detect():
    # ... existing code
    threading.Thread(target=service.trigger_detection, daemon=True).start()
    return jsonify({"message": "Detect triggered"}), 200
```

**Новый код:**
```python
@app.route("/detect", methods=["POST"])
def trigger_detect():
    # Get Authorization header from request
    auth_header = request.headers.get("Authorization")
    
    # Pass the auth token to the detection service
    threading.Thread(
        target=service.trigger_detection,
        args=(auth_header,),
        daemon=True
    ).start()
    
    return jsonify({"message": "Detect triggered"}), 200
```

### 3. Обновите метод `trigger_detection` в классе `DetectionService`

Найдите метод `trigger_detection` (примерно строка 580) и обновите его:

**Старый код:**
```python
def trigger_detection(self) -> None:
    with self.lock:
        # ... existing code
        result = self._send_detection(payload)
        # ... rest
```

**Новый код:**
```python
def trigger_detection(self, auth_token: Optional[str] = None) -> None:
    with self.lock:
        # ... existing code (keep all the detection logic)
        result = self._send_detection(payload, auth_token)
        # ... rest
```

### 4. Обновите автоматическую отправку

Найдите код автоматической отправки (примерно строка 550-570) и обновите:

**ВАЖНО:** Автоматическая отправка БЕЗ токена больше не будет работать!

```python
# В методе run_detection() или аналогичном
if time.time() - self.last_send_ts >= SEND_INTERVAL:
    # Автоматическая отправка теперь будет пропускаться без auth token
    # Отправка будет происходить только когда пользователь нажимает "Detect" в Dashboard
    logger.warning("Автоматическая отправка отключена. Используйте кнопку Detect в Dashboard.")
    self.last_send_ts = time.time()
```

## Результат

После этих изменений:
- ✅ Детекции будут привязываться к пользователю, который нажал кнопку "Detect" в Dashboard
- ✅ Каждый пользователь будет видеть только свои детекции
- ✅ Суперадмины могут видеть все детекции
- ✅ Безопасность данных значительно повышена

## Перезапуск сервиса

После внесения изменений перезапустите Python скрипт:

```bash
sudo systemctl restart yolo-detect.service
# или
./yolo_detect.py
```

## Проверка

1. Откройте Dashboard
2. Войдите в систему под своим пользователем
3. Нажмите кнопку "Detect"
4. Детекция должна появиться в вашем списке детекций
5. Другие пользователи НЕ должны видеть эту детекцию

## Поддержка

Если возникнут проблемы, проверьте логи:
- Логи Raspberry Pi: `~/raspberry-src/logs/yolo_detect.log`
- Логи Edge Function: в Lovable Cloud Backend
