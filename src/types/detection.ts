import type { Tables } from "@/integrations/supabase/types";

export type DetectionStatus = Tables<"detections">["status"];
export type DetectionRow = Tables<"detections">;
export type DetectionImageRow = Tables<"detection_images">;

export interface DetectionMetadata {
  temperature?: number;
  humidity?: number;
  [key: string]: unknown;
}

export interface PlantImage {
  image_url: string;
  order_num: number;
}

export interface Detection
  extends Omit<DetectionRow, "metadata"> {
  metadata: DetectionMetadata;
  plant_images: PlantImage[];
}

export type DetectionQueryResult =
  & DetectionRow
  & {
    plant_images?:
      | Array<
        Partial<Pick<DetectionImageRow, "image_url" | "order_num">> | null
      >
      | null;
  };
