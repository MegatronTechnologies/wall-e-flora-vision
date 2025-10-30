import { supabase } from "@/integrations/supabase/client";
import type { Detection } from "@/types/detection";
import { logger } from "@/lib/logger";
import { normalizeDetection } from "@/lib/detections";

const ensureAuthenticated = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    logger.warn("AdminDataService", "No active session found");
    throw new Error("AUTH_REQUIRED");
  }
  return data.session;
};

// ===== DETECTIONS =====

export const fetchAllDetections = async (): Promise<Detection[]> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", "Fetching all detections");

  const { data, error } = await supabase
    .from("detections")
    .select(`
      *,
      plant_images:detection_images(image_url, order_num)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("AdminDataService", "Failed to fetch detections", error);
    throw error;
  }

  const detections = (data ?? []).map(normalizeDetection);
  logger.info("AdminDataService", `Fetched ${detections.length} detections`);
  return detections;
};

export const deleteDetection = async (id: string): Promise<void> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", "Deleting detection", id);

  const { error } = await supabase
    .from("detections")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("AdminDataService", "Failed to delete detection", error);
    throw error;
  }

  logger.info("AdminDataService", "Detection deleted", id);
};

export const bulkDeleteDetections = async (ids: string[]): Promise<void> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", `Bulk deleting ${ids.length} detections`);

  const { error } = await supabase
    .from("detections")
    .delete()
    .in("id", ids);

  if (error) {
    logger.error("AdminDataService", "Failed to bulk delete detections", error);
    throw error;
  }

  logger.info("AdminDataService", `Bulk deleted ${ids.length} detections`);
};

// ===== DETECTION IMAGES =====

export interface DetectionImage {
  id: string;
  detection_id: string;
  image_url: string;
  order_num: number;
  created_at: string;
}

export const fetchAllDetectionImages = async (): Promise<DetectionImage[]> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", "Fetching all detection images");

  const { data, error } = await supabase
    .from("detection_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("AdminDataService", "Failed to fetch detection images", error);
    throw error;
  }

  logger.info("AdminDataService", `Fetched ${data?.length ?? 0} detection images`);
  return data ?? [];
};

export const deleteDetectionImage = async (id: string): Promise<void> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", "Deleting detection image", id);

  const { error } = await supabase
    .from("detection_images")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("AdminDataService", "Failed to delete detection image", error);
    throw error;
  }

  logger.info("AdminDataService", "Detection image deleted", id);
};

export const bulkDeleteDetectionImages = async (ids: string[]): Promise<void> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", `Bulk deleting ${ids.length} detection images`);

  const { error } = await supabase
    .from("detection_images")
    .delete()
    .in("id", ids);

  if (error) {
    logger.error("AdminDataService", "Failed to bulk delete detection images", error);
    throw error;
  }

  logger.info("AdminDataService", `Bulk deleted ${ids.length} detection images`);
};
