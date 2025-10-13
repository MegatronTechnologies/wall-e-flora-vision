import { Button } from "@/components/ui/button";
import { Loader2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DetectionActionsProps {
  onStream: () => void;
  onDetect: () => void;
  isDetecting: boolean;
}

const DetectionActions = ({ onStream, onDetect, isDetecting }: DetectionActionsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="lg"
        onClick={onStream}
        className="bg-secondary hover:bg-secondary/80 gap-3 text-2xl px-6 py-5"
      >
        <Video className="h-6 w-6" />
        {t("dashboard.scan", { defaultValue: "Scan" })}
      </Button>
      <Button
        size="lg"
        onClick={onDetect}
        disabled={isDetecting}
        className="bg-primary hover:bg-primary/90 text-2xl px-6 py-5 animate-glow"
      >
        {isDetecting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        {t("dashboard.detect")}
      </Button>
    </div>
  );
};

export default DetectionActions;
