import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

interface LiveStreamModalProps {
  open: boolean;
  onClose: () => void;
  onDetect: () => void;
  detecting: boolean;
  realsenseStreamUrl?: string;
  rpiCam3StreamUrl?: string;
}

type CameraKey = "realsense" | "rpiCam3";

const LiveStreamModal = ({
  open,
  onClose,
  onDetect,
  detecting,
  realsenseStreamUrl,
  rpiCam3StreamUrl,
}: LiveStreamModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [imageKey, setImageKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamError, setStreamError] = useState<Record<CameraKey, boolean>>({
    realsense: false,
    rpiCam3: false,
  });
  const [useMjpeg, setUseMjpeg] = useState<Record<CameraKey, boolean>>({
    realsense: true,
    rpiCam3: true,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      logger.info("LiveStreamModal", "📹 Scan modal opened");
      if (!realsenseStreamUrl || !rpiCam3StreamUrl) {
        logger.warn("LiveStreamModal", "⚠️ One or more stream URLs not configured");
      } else {
        logger.debug("LiveStreamModal", `RealSense URL: ${realsenseStreamUrl}`);
        logger.debug("LiveStreamModal", `RPI Cam3 URL: ${rpiCam3StreamUrl}`);
      }
      setStreamError({ realsense: false, rpiCam3: false });
      setUseMjpeg({ realsense: true, rpiCam3: true });
      setImageKey(Date.now());
    }
  }, [open, realsenseStreamUrl, rpiCam3StreamUrl]);

  const handleManualRefresh = () => {
    logger.info("LiveStreamModal", "🔄 Manual refresh triggered");
    setIsRefreshing(true);
    setStreamError({ realsense: false, rpiCam3: false });
    setUseMjpeg({ realsense: true, rpiCam3: true });
    setImageKey(Date.now());
    logger.debug("LiveStreamModal", "Attempting to reconnect to both MJPEG streams");
    setTimeout(() => {
      setIsRefreshing(false);
      logger.debug("LiveStreamModal", "Refresh completed");
    }, 500);
  };

  const handleStreamError = (camera: CameraKey) => {
    logger.error("LiveStreamModal", `❌ ${camera} MJPEG stream error, falling back to snapshot mode`);
    setStreamError((prev) => ({ ...prev, [camera]: true }));
    setUseMjpeg((prev) => ({ ...prev, [camera]: false }));

    toast({
      title: t("dashboard.stream.errorTitle", { defaultValue: "Stream Error" }),
      description: t("dashboard.stream.errorDescription", {
        defaultValue: "Live stream unavailable. Switched to snapshot mode."
      }),
      variant: "destructive",
    });
  };

  // Auto-refresh for snapshot fallback mode (only when MJPEG fails)
  useEffect(() => {
    const hasSnapshotMode = !useMjpeg.realsense || !useMjpeg.rpiCam3;
    if (!open || !hasSnapshotMode) return;

    logger.debug("LiveStreamModal", "Starting snapshot auto-refresh (100ms interval) for failed streams");
    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 100);

    return () => {
      logger.debug("LiveStreamModal", "Stopping snapshot auto-refresh");
      clearInterval(interval);
    };
  }, [open, useMjpeg]);

  return (
    <Modal isOpen={open} onClose={onClose} title={t("dashboard.liveStream", { defaultValue: "Live Stream" })}>
      <div className="relative mb-4 flex justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="bg-secondary/80 hover:bg-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button
          size="sm"
          onClick={onDetect}
          disabled={detecting}
          className="bg-primary hover:bg-primary/90"
        >
          {detecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("dashboard.detect")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Intel RealSense D455 (flowers)</p>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            {realsenseStreamUrl ? (
              <>
                <img
                  key={useMjpeg.realsense ? "mjpeg-realsense" : `snapshot-realsense-${imageKey}`}
                  src={
                    useMjpeg.realsense
                      ? `${realsenseStreamUrl}/stream?t=${imageKey}`
                      : `${realsenseStreamUrl}/snapshot?t=${imageKey}`
                  }
                  alt="Intel RealSense stream"
                  className="h-full w-full object-cover"
                  onError={() => handleStreamError("realsense")}
                />
                {streamError.realsense && (
                  <div className="absolute bottom-3 left-3 rounded bg-yellow-500/80 px-2 py-1 text-xs text-black">
                    Snapshot mode (MJPEG unavailable)
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.streamUnavailable", { defaultValue: "Stream URL not configured." })}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Raspberry Camera Module 3 (diseases)</p>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            {rpiCam3StreamUrl ? (
              <>
                <img
                  key={useMjpeg.rpiCam3 ? "mjpeg-rpi-cam3" : `snapshot-rpi-cam3-${imageKey}`}
                  src={
                    useMjpeg.rpiCam3
                      ? `${rpiCam3StreamUrl}/stream?t=${imageKey}`
                      : `${rpiCam3StreamUrl}/snapshot?t=${imageKey}`
                  }
                  alt="Raspberry Cam3 stream"
                  className="h-full w-full object-cover"
                  onError={() => handleStreamError("rpiCam3")}
                />
                {streamError.rpiCam3 && (
                  <div className="absolute bottom-3 left-3 rounded bg-yellow-500/80 px-2 py-1 text-xs text-black">
                    Snapshot mode (MJPEG unavailable)
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.streamUnavailable", { defaultValue: "Stream URL not configured." })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {(!useMjpeg.realsense || !useMjpeg.rpiCam3)
          ? t("dashboard.streamNote", { defaultValue: "Snapshot mode - updates every 100ms. Click refresh for immediate update." })
          : t("dashboard.streamNoteMjpeg", { defaultValue: "Live MJPEG stream. Click refresh to reconnect if needed." })}
      </p>
    </Modal>
  );
};

export default LiveStreamModal;
