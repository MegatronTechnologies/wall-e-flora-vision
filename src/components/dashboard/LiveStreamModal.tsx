import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LiveStreamModalProps {
  open: boolean;
  onClose: () => void;
  onDetect: () => void;
  detecting: boolean;
  streamUrl?: string;
}

const LiveStreamModal = ({ open, onClose, onDetect, detecting, streamUrl }: LiveStreamModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={open} onClose={onClose} title={t("dashboard.liveStream", { defaultValue: "Live Stream" })}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <div className="absolute right-3 top-3 z-10">
          <Button size="sm" onClick={onDetect} disabled={detecting} className="bg-primary hover:bg-primary/90 text-base">
            {detecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("dashboard.detect")}
          </Button>
        </div>
        {streamUrl ? (
          <iframe src={streamUrl} title="Raspberry Pi Stream" className="h-full w-full" allow="autoplay" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.streamUnavailable", { defaultValue: "Stream URL not configured." })}
            </p>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("dashboard.streamNote", {
          defaultValue: "Ensure the Raspberry Pi streaming service is running and accessible.",
        })}
      </p>
    </Modal>
  );
};

export default LiveStreamModal;
