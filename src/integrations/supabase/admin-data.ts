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

// ===== STORAGE FILES =====

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

const listFilesRecursively = async (path: string = ''): Promise<StorageFile[]> => {
  const { data, error } = await supabase.storage
    .from('detection-images')
    .list(path, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) throw error;
  if (!data) return [];

  const files: StorageFile[] = [];
  
  for (const item of data) {
    const itemPath = path ? `${path}/${item.name}` : item.name;
    
    // If it's a folder (no metadata.size means it's a folder)
    if (!item.metadata?.size && item.id === null) {
      // Recursively get files from this folder
      const subFiles = await listFilesRecursively(itemPath);
      files.push(...subFiles);
    } else {
      // It's a file, add it with full path
      files.push({
        ...item,
        name: itemPath
      });
    }
  }
  
  return files;
};

export const fetchStorageFiles = async (): Promise<StorageFile[]> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", "Fetching storage files recursively");

  try {
    const files = await listFilesRecursively();
    logger.info("AdminDataService", `Fetched ${files.length} storage files`);
    return files;
  } catch (error) {
    logger.error("AdminDataService", "Failed to fetch storage files", error);
    throw error;
  }
};

export const deleteStorageFile = async (fileName: string): Promise<void> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", "Deleting storage file", fileName);

  try {
    const { data, error } = await supabase.storage
      .from('detection-images')
      .remove([fileName]);

    if (error) {
      logger.error("AdminDataService", "Storage API error", error);
      throw error;
    }
    
    logger.info("AdminDataService", "Storage file deleted successfully", { fileName, data });
  } catch (error) {
    logger.error("AdminDataService", "Failed to delete storage file", error);
    throw error;
  }
};

export const bulkDeleteStorageFiles = async (fileNames: string[]): Promise<void> => {
  await ensureAuthenticated();
  logger.debug("AdminDataService", `Bulk deleting ${fileNames.length} storage files`, fileNames);

  try {
    const { data, error } = await supabase.storage
      .from('detection-images')
      .remove(fileNames);

    if (error) {
      logger.error("AdminDataService", "Storage API bulk delete error", error);
      throw error;
    }
    
    logger.info("AdminDataService", `Bulk deleted ${fileNames.length} storage files successfully`, { count: fileNames.length, data });
  } catch (error) {
    logger.error("AdminDataService", "Failed to bulk delete storage files", error);
    throw error;
  }
};
