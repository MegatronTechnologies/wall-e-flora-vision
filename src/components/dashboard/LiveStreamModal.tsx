import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

interface LiveStreamModalProps {
  open: boolean;
  onClose: () => void;
  onDetect: () => void;
  detecting: boolean;
  streamUrl?: string;
}

const LiveStreamModal = ({ open, onClose, onDetect, detecting, streamUrl }: LiveStreamModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [imageKey, setImageKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [useMjpeg, setUseMjpeg] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      logger.info("LiveStreamModal", "📹 Scan modal opened");
      if (!streamUrl) {
        logger.warn("LiveStreamModal", "⚠️ Stream URL not configured");
      } else {
        logger.debug("LiveStreamModal", `Stream URL: ${streamUrl}`);
      }
      setStreamError(false);
      setUseMjpeg(true);
      setImageKey(Date.now());
    }
  }, [open, streamUrl]);

  const handleManualRefresh = () => {
    logger.info("LiveStreamModal", "🔄 Manual refresh triggered");
    setIsRefreshing(true);
    setStreamError(false);
    setUseMjpeg(true);
    setImageKey(Date.now());
    logger.debug("LiveStreamModal", "Attempting to reconnect to MJPEG stream");
    setTimeout(() => {
      setIsRefreshing(false);
      logger.debug("LiveStreamModal", "Refresh completed");
    }, 500);
  };

  const handleStreamError = () => {
    logger.error("LiveStreamModal", "❌ MJPEG stream error, falling back to snapshot mode");
    setStreamError(true);
    setUseMjpeg(false);
    
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
    if (!open || !streamUrl || useMjpeg) return;

    logger.debug("LiveStreamModal", "Starting snapshot auto-refresh (100ms interval)");
    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 100);

    return () => {
      logger.debug("LiveStreamModal", "Stopping snapshot auto-refresh");
      clearInterval(interval);
    };
  }, [open, streamUrl, useMjpeg]);

  return (
    <Modal isOpen={open} onClose={onClose} title={t("dashboard.liveStream", { defaultValue: "Live Stream" })}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            onClick={handleManualRefresh} 
            disabled={isRefreshing || !streamUrl}
            className="bg-secondary/80 hover:bg-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
        {streamUrl ? (
          <>
            <img
              ref={imgRef}
              key={useMjpeg ? 'mjpeg' : `snapshot-${imageKey}`}
              src={
                useMjpeg
                  ? `${streamUrl}/stream?t=${imageKey}`
                  : `${streamUrl}/snapshot?t=${imageKey}`
              }
              alt="Raspberry Pi Stream"
              className="h-full w-full object-cover"
              onError={handleStreamError}
            />
            {streamError && (
              <div className="absolute bottom-3 left-3 rounded bg-yellow-500/80 px-2 py-1 text-xs text-black">
                Snapshot mode (MJPEG unavailable)
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t("dashboard.streamUnavailable", { defaultValue: "Stream URL not configured." })}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Configure VITE_PI_STREAM_URL in environment
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {useMjpeg
          ? t("dashboard.streamNoteMjpeg", { defaultValue: "Live MJPEG stream. Click refresh to reconnect if needed." })
          : t("dashboard.streamNote", { defaultValue: "Snapshot mode - updates every 100ms. Click refresh for immediate update." })
        }
      </p>
    </Modal>
  );
};

export default LiveStreamModal;
