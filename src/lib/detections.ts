import type {
  Detection,
  DetectionMetadata,
  DetectionQueryResult,
  PlantImage,
} from "@/types/detection";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseNumeric = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const parseMetadata = (value: unknown): DetectionMetadata => {
  if (!isRecord(value)) {
    return {};
  }

  const metadata: DetectionMetadata = {};

  const temperature = parseNumeric(value.temperature);
  if (temperature !== undefined) {
    metadata.temperature = temperature;
  }

  const humidity = parseNumeric(value.humidity);
  if (humidity !== undefined) {
    metadata.humidity = humidity;
  }

  for (const [key, raw] of Object.entries(value)) {
    if (!(key in metadata)) {
      metadata[key] = raw;
    }
  }

  return metadata;
};

const normalizePlantImages = (images: DetectionQueryResult["plant_images"]) => {
  if (!images) {
    return [];
  }

  return images
    .filter((image): image is PlantImage =>
      Boolean(image?.image_url) && typeof image?.order_num === "number"
    )
    .sort((a, b) => a.order_num - b.order_num);
};

export const normalizeDetection = (
  raw: DetectionQueryResult,
): Detection => ({
  id: raw.id,
  created_at: raw.created_at,
  device_id: raw.device_id,
  image_url: raw.image_url,
  status: raw.status,
  confidence: raw.confidence,
  metadata: parseMetadata(raw.metadata),
  user_id: raw.user_id,
  plant_images: normalizePlantImages(raw.plant_images),
});
