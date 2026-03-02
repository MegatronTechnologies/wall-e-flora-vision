# Dual Camera Pipeline

Target architecture:

Camera -> Raspberry publisher -> Mediator server (YOLO) -> Web dashboard

## Folder layout

- `server/mediator_server.py`: receives frames from both cameras, runs dual YOLO, exposes `/detect` and stream endpoints.
- `raspberry/realsense_publisher.py`: pushes Intel RealSense frames to mediator.
- `raspberry/rpi_cam3_publisher.py`: pushes RPi Cam3 frames to mediator using validated color pipeline (YUV420 + I420->BGR).
- `site/.env.dual-camera.example`: dashboard environment for mediator endpoints.

## Detection split

- RealSense camera classes: `ficus_elastica`, `kalanchoe`, `pelargonium`
- RPi Cam3 classes: `mealybug_infestation`, `black_spot`, `plant_rust`

## Quick run

1. Start mediator server:

```bash
cd dual-camera-pipeline/server
pip install -r requirements.txt
python3 mediator_server.py
```

2. Start camera publishers on Raspberry Pi:

```bash
cd dual-camera-pipeline/raspberry
pip install -r requirements.txt
MEDIATOR_URL=http://<mediator-host>:8090 python3 realsense_publisher.py
MEDIATOR_URL=http://<mediator-host>:8090 python3 rpi_cam3_publisher.py
```

3. Apply site env values from `site/.env.dual-camera.example` and run the web app.

## Notes

- `Detect` in dashboard now calls mediator `/detect`.
- Scan modal shows two streams in parallel, both already processed by YOLO.
- Detection rows are still sent via existing `submit-detection` contract for dashboard compatibility.
- By default mediator auto-discovers `.pt` models in `/home/megtech/Desktop` (`flower*` for flowers, `disease*` for diseases). You can override with:
  - `FLOWER_MODEL_PATH=/absolute/path/flowers.pt`
  - `DISEASE_MODEL_PATH=/absolute/path/diseases.pt`
