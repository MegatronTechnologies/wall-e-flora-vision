# Logging & Auto-Reconnect - Документация

## ✅ Реализованные улучшения

### 1. 📝 Structured Logging

Оба скрипта (`yolo_detect.py` и `old-yolo.py`) теперь используют structured logging вместо `print()`.

#### Файлы логов

Логи сохраняются в папку `logs/`:

```
Desktop/megtech/logs/
├── yolo_detect.log    # Логи для yolo_detect.py
└── old-yolo.log       # Логи для old-yolo.py
```

#### Особенности:

- ✅ **Автоматическая очистка:** При каждом запуске старый лог-файл удаляется (сохраняется только последняя сессия)
- ✅ **Два уровня вывода:**
  - **Console (INFO):** Основная информация выводится в терминал
  - **File (DEBUG):** Детальные логи (включая debug сообщения) пишутся в файл
- ✅ **Структурированный формат:**
  - Console: `2025-10-25 14:30:15 [INFO] RealSense pipeline запущен 640x480@15`
  - File: `2025-10-25 14:30:15 [DEBUG] yolo_detect:185 - Загружены классы: {0: 'chrysanthemum', 1: 'mealybug'}`

#### Уровни логирования:

```python
logger.debug()    # Детальная отладочная информация (только в файл)
logger.info()     # Общая информация (консоль + файл)
logger.warning()  # Предупреждения (консоль + файл)
logger.error()    # Ошибки с полным stack trace (консоль + файл)
```

---

### 2. 🔄 Auto-Reconnect для RealSense камеры

Если камера отключается или возникают проблемы с получением кадров, скрипты автоматически переподключаются.

#### Как работает:

1. **При старте:** До 5 попыток подключения с интервалом 2 секунды
2. **Во время работы:**
   - Счётчик ошибок увеличивается при каждой проблеме
   - После 10 последовательных ошибок → автоматическое переподключение
   - При успешном кадре счётчик сбрасывается

#### Логи при переподключении:

```
2025-10-25 14:35:20 [WARNING] No color frame received
2025-10-25 14:35:21 [WARNING] No color frame received
...
2025-10-25 14:35:30 [ERROR] Слишком много ошибок получения кадра (10), переподключаем камеру...
2025-10-25 14:35:30 [INFO] Попытка переподключения камеры...
2025-10-25 14:35:32 [INFO] RealSense pipeline запущен 640x480@15
2025-10-25 14:35:32 [INFO] Камера успешно переподключена
```

---

## 🚀 Использование

### Запуск yolo_detect.py

```bash
cd Desktop/megtech
source pi-env.sh  # Загрузить environment variables
python3 yolo_detect.py
```

**Вывод в консоль:**
```
2025-10-25 14:30:00 [INFO] ============================================================
2025-10-25 14:30:00 [INFO] YOLO Detection Service - Starting
2025-10-25 14:30:00 [INFO] ============================================================
2025-10-25 14:30:00 [INFO] Device ID: raspi-001
2025-10-25 14:30:00 [INFO] Model: best_ncnn_model
2025-10-25 14:30:00 [INFO] Camera: 640x480@15
2025-10-25 14:30:00 [INFO] Send Interval: 15s
2025-10-25 14:30:00 [INFO] HTTP Server: 0.0.0.0:8080
2025-10-25 14:30:01 [INFO] Загрузка YOLO модели: best_ncnn_model
2025-10-25 14:30:03 [INFO] RealSense pipeline запущен 640x480@15
2025-10-25 14:30:03 [INFO] Запуск основного цикла детекции
2025-10-25 14:30:03 [INFO] HTTP сервер запущен на 0.0.0.0:8080
2025-10-25 14:30:03 [INFO] Endpoints: /snapshot, /status, /detect (POST)
```

**Проверить логи:**
```bash
# Смотреть лог в реальном времени
tail -f logs/yolo_detect.log

# Посмотреть весь лог
cat logs/yolo_detect.log

# Найти ошибки
grep ERROR logs/yolo_detect.log
```

---

### Запуск old-yolo.py

```bash
cd Desktop/megtech
python3 old-yolo.py
```

**Вывод в консоль:**
```
2025-10-25 14:32:00 [INFO] ============================================================
2025-10-25 14:32:00 [INFO] Old YOLO Detection Service - Starting
2025-10-25 14:32:00 [INFO] ============================================================
2025-10-25 14:32:00 [INFO] Starting main loop. Press Q to quit, P to pause, S to save full frame, F to save crops (chrysanthemum).
2025-10-25 14:32:00 [INFO] Загрузка YOLO модели: best_ncnn_model
2025-10-25 14:32:02 [INFO] RealSense pipeline запущен 1280x720@30fps
2025-10-25 14:32:02 [INFO] HTTP Server запущен на 0.0.0.0:8080
2025-10-25 14:32:02 [INFO] [HTTP] MJPEG stream:	http://127.0.0.1:8080/stream
2025-10-25 14:32:02 [INFO] [HTTP] Snapshot:	http://127.0.0.1:8080/snapshot
2025-10-25 14:32:02 [INFO] [HTTP] Status:	http://127.0.0.1:8080/status
2025-10-25 14:32:02 [INFO] Display mode: disabled
```

**Проверить логи:**
```bash
tail -f logs/old-yolo.log
```

---

## 📊 Примеры логов

### DEBUG логи (только в файле)

```
2025-10-25 14:30:03 [DEBUG] yolo_detect:185 - Загружены классы: {0: 'chrysanthemum', 1: 'mealybug'}
2025-10-25 14:30:05 [DEBUG] yolo_detect:273 - Frame processed: status=healthy, conf=87.5, count=2, fps=12.34
2025-10-25 14:30:20 [DEBUG] yolo_detect:309 - Pipeline остановлен
```

### INFO логи (консоль + файл)

```
2025-10-25 14:30:00 [INFO] YOLO Detection Service - Starting
2025-10-25 14:30:03 [INFO] RealSense pipeline запущен 640x480@15
2025-10-25 14:30:15 [INFO] Детекция отправлена в Lovable Cloud (healthy, count=2) -> {'status': 'success'}
2025-10-25 14:30:15 [INFO] Supabase row записан успешно
```

### WARNING логи

```
2025-10-25 14:35:20 [WARNING] Нет цветового кадра
2025-10-25 14:35:21 [WARNING] Supabase insert failed: Connection timeout
```

### ERROR логи (с stack trace)

```
2025-10-25 14:40:00 [ERROR] Ошибка получения кадра (5/10): RuntimeError: Frame didn't arrive within timeout
2025-10-25 14:40:10 [ERROR] Слишком много ошибок подряд, переподключаем камеру...
2025-10-25 14:40:15 [ERROR] Неожиданная ошибка в цикле детекции: ValueError: Invalid frame shape
Traceback (most recent call last):
  File "/home/MegTech/Desktop/megtech/yolo_detect.py", line 265, in _loop
    results = self.model(frame, verbose=False)
ValueError: Invalid frame shape
```

---

## 🛠️ Troubleshooting

### Проблема: Логи не создаются

**Решение:**
```bash
# Проверить, что папка logs/ существует
ls -la Desktop/megtech/logs/

# Если нет, создать вручную
mkdir -p Desktop/megtech/logs/

# Проверить права
chmod 755 Desktop/megtech/logs/
```

---

### Проблема: Камера постоянно переподключается

**Проверить логи:**
```bash
grep "переподключаем камеру" logs/yolo_detect.log
```

**Возможные причины:**
1. USB кабель плохого качества → заменить
2. Недостаточно питания → использовать powered USB hub
3. Проблема с librealsense → переустановить: `sudo apt install librealsense2-dkms`

**Проверить USB подключение:**
```bash
# Должно показать Intel RealSense
lsusb | grep Intel

# Проверить с помощью realsense-viewer
realsense-viewer
```

---

### Проблема: Слишком много DEBUG логов в файле

**Изменить уровень:**

Отредактируй функцию `setup_logging()` в скрипте:

```python
# Вместо DEBUG использовать INFO для файла
file_handler.setLevel(logging.INFO)  # Было: logging.DEBUG
```

---

### Проблема: Хочу сохранить историю логов (не удалять при запуске)

**Решение: Rotated logs**

Замени в `setup_logging()`:

```python
from logging.handlers import RotatingFileHandler

# Вместо:
file_handler = logging.FileHandler(log_file, mode='w', encoding='utf-8')

# Используй:
file_handler = RotatingFileHandler(
    log_file,
    mode='a',           # Append вместо overwrite
    maxBytes=10*1024*1024,  # 10MB per file
    backupCount=5,      # Сохранять 5 файлов
    encoding='utf-8'
)
```

Будут создаваться файлы:
```
logs/yolo_detect.log
logs/yolo_detect.log.1
logs/yolo_detect.log.2
...
logs/yolo_detect.log.5
```

---

## 📈 Анализ логов

### Найти все ошибки за последнюю сессию:

```bash
grep ERROR logs/yolo_detect.log
```

### Подсчитать количество детекций:

```bash
grep "Детекция отправлена" logs/yolo_detect.log | wc -l
```

### Найти случаи переподключения камеры:

```bash
grep "переподключена" logs/yolo_detect.log
```

### Посмотреть только последние 50 строк:

```bash
tail -50 logs/yolo_detect.log
```

### Отслеживать логи в реальном времени:

```bash
tail -f logs/yolo_detect.log
```

### Поиск по временному диапазону:

```bash
# Логи между 14:30 и 15:00
sed -n '/14:30/,/15:00/p' logs/yolo_detect.log
```

---

## 🎉 Преимущества новой системы

✅ **Debugging:** Можно легко найти причину проблем в логах
✅ **Надёжность:** Скрипт не падает при временных проблемах с камерой
✅ **Мониторинг:** Можно отслеживать работу сервиса удалённо через логи
✅ **Производительность:** DEBUG логи не замедляют работу (пишутся асинхронно)
✅ **История:** Видна полная история работы последней сессии

---

## 📝 Что дальше?

Следующие возможные улучшения (из IMPROVEMENTS.md):

1. **Config file (YAML)** - управление настройками через конфиг файл
2. **Health check endpoint** - `/health` для мониторинга
3. **Frame skipping** - обработка каждого N-го кадра для повышения FPS
4. **Video recording** - автозапись видео при детекции болезни

Скажи, если хочешь реализовать что-то из этого! 🚀
