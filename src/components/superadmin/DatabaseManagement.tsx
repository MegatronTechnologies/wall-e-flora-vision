import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import DetectionsTable from "./DetectionsTable";
import DetectionImagesTable from "./DetectionImagesTable";
import StorageFilesTable from "./StorageFilesTable";
import { 
  fetchAllDetections, 
  fetchAllDetectionImages, 
  fetchStorageFiles,
  type DetectionImage,
  type StorageFile 
} from "@/integrations/supabase/admin-data";
import type { Detection } from "@/types/detection";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const DatabaseManagement = () => {
  const { t } = useTranslation();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [images, setImages] = useState<DetectionImage[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loadingDetections, setLoadingDetections] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const loadDetections = async () => {
    setLoadingDetections(true);
    try {
      const data = await fetchAllDetections();
      setDetections(data);
    } catch (error) {
      console.error("Load detections error:", error);
      toast.error(t("dashboard.loadError"));
    } finally {
      setLoadingDetections(false);
    }
  };

  const loadImages = async () => {
    setLoadingImages(true);
    try {
      const data = await fetchAllDetectionImages();
      setImages(data);
    } catch (error) {
      console.error("Load images error:", error);
      toast.error(t("admin.loadImagesError"));
    } finally {
      setLoadingImages(false);
    }
  };

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const data = await fetchStorageFiles();
      setFiles(data);
    } catch (error) {
      console.error("Load storage files error:", error);
      toast.error(t("admin.loadError"));
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadDetections();
    loadImages();
    loadFiles();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {t("admin.database")}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadDetections();
            loadImages();
            loadFiles();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("common.retry")}
        </Button>
      </div>

      <Tabs defaultValue="detections" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="detections">
            {t("admin.detections")} ({detections.length})
          </TabsTrigger>
          <TabsTrigger value="images">
            {t("admin.detectionImages")} ({images.length})
          </TabsTrigger>
          <TabsTrigger value="storage">
            {t("admin.storageFiles")} ({files.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detections" className="mt-6">
          <DetectionsTable
            detections={detections}
            loading={loadingDetections}
            onRefresh={loadDetections}
          />
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          <DetectionImagesTable
            images={images}
            loading={loadingImages}
            onRefresh={loadImages}
          />
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <StorageFilesTable
            files={files}
            loading={loadingFiles}
            onRefresh={loadFiles}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseManagement;
