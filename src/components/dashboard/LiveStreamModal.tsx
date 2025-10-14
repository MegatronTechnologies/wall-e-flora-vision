import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

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

  // Auto-refresh stream every 2 seconds for MJPEG-like experience
  useEffect(() => {
    if (!open || !streamUrl) return;
    
    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, [open, streamUrl]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setImageKey(Date.now());
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
          <img 
            key={imageKey}
            src={`${streamUrl}?t=${imageKey}`} 
            alt="Raspberry Pi Stream" 
            className="h-full w-full object-cover"
            onError={(e) => {
              console.error('Stream loading error');
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23222" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23666"%3ENo Stream%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t("dashboard.streamUnavailable", { defaultValue: "Stream URL not configured." })}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Configure VITE_STREAM_URL in environment
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("dashboard.streamNote", {
          defaultValue: "Stream updates every 2 seconds. Click refresh for immediate update.",
        })}
      </p>
    </Modal>
  );
};

export default LiveStreamModal;
