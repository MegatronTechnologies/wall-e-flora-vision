import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";

interface LiveStreamModalProps {
  open: boolean;
  onClose: () => void;
  onDetect: () => void;
  detecting: boolean;
  streamUrl?: string;
}

const LiveStreamModal = ({ open, onClose, onDetect, detecting, streamUrl }: LiveStreamModalProps) => {
  const { t } = useTranslation();
  const [imageKey, setImageKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [useMjpeg, setUseMjpeg] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStreamError(false);
      setUseMjpeg(true);
      setImageKey(Date.now());
    }
  }, [open]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setStreamError(false);
    setUseMjpeg(true); // Try MJPEG again on manual refresh
    setImageKey(Date.now());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleStreamError = () => {
    console.error('MJPEG stream error, falling back to snapshot mode');
    setStreamError(true);
    setUseMjpeg(false);
  };

  // Auto-refresh for snapshot fallback mode (only when MJPEG fails)
  useEffect(() => {
    if (!open || !streamUrl || useMjpeg) return;

    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 500);

    return () => clearInterval(interval);
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
          : t("dashboard.streamNote", { defaultValue: "Snapshot mode - updates every 500ms. Click refresh for immediate update." })
        }
      </p>
    </Modal>
  );
};

export default LiveStreamModal;
