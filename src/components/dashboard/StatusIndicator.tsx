import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Minus, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

interface PiStatus {
  deviceId: string;
  status: "healthy" | "diseased" | "mixed" | "noObjects";
  confidence: number;
  objectCount: number;
  avgFps: number;
  lastFrameTs: number;
}

const StatusIndicator = () => {
  const { t } = useTranslation();
  const piStreamUrl = import.meta.env.VITE_PI_STREAM_URL;

  const { data: status, isError } = useQuery<PiStatus>({
    queryKey: ["pi-status"],
    queryFn: async () => {
      const response = await fetch(`${piStreamUrl}/status`);
      if (!response.ok) throw new Error("Failed to fetch status");
      return response.json();
    },
    refetchInterval: 3000,
    retry: 1,
  });

  if (isError || !status) {
    return (
      <Card className="p-4 border-border/60 bg-card/70">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <Minus className="h-3 w-3 mr-1" />
            {t("dashboard.deviceOffline", { defaultValue: "Device Offline" })}
          </Badge>
        </div>
      </Card>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "healthy":
        return {
          icon: CheckCircle,
          label: t("dashboard.status.healthy", { defaultValue: "Healthy" }),
          className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        };
      case "diseased":
        return {
          icon: AlertCircle,
          label: t("dashboard.status.diseased", { defaultValue: "Diseased" }),
          className: "bg-red-500/10 text-red-500 border-red-500/20",
        };
      case "mixed":
        return {
          icon: AlertTriangle,
          label: t("dashboard.status.mixed", { defaultValue: "Mixed" }),
          className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        };
      case "noObjects":
        return {
          icon: Minus,
          label: t("dashboard.status.noObjects", { defaultValue: "No Objects" }),
          className: "bg-muted text-muted-foreground",
        };
      default:
        return {
          icon: Minus,
          label: "Unknown",
          className: "bg-muted text-muted-foreground",
        };
    }
  };

  const config = getStatusConfig(status.status);
  const StatusIcon = config.icon;
  const lastUpdate = formatDistanceToNow(new Date(status.lastFrameTs * 1000), { addSuffix: true });

  return (
    <Card className="p-4 border-border/60 bg-card/70">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("dashboard.liveStatus", { defaultValue: "Live Status" })}
          </h3>
          <span className="text-xs text-muted-foreground">
            {t("dashboard.device", { defaultValue: "Device" })}: {status.deviceId}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={`${config.className} border`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          <span className="text-sm text-foreground font-medium">
            {status.confidence.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">
              {t("dashboard.objects", { defaultValue: "Objects" })}:
            </span>
            <span className="ml-1 text-foreground font-medium">{status.objectCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">FPS:</span>
            <span className="ml-1 text-foreground font-medium">{status.avgFps.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("dashboard.updated", { defaultValue: "Updated" })}:
            </span>
            <span className="ml-1 text-foreground font-medium">{lastUpdate}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatusIndicator;
