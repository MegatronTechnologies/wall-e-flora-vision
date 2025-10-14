import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export interface DetectionStats {
  total: number;
  healthy: number;
  diseased: number;
  lastDetection: string | null;
}

interface DetectionStatsProps {
  stats: DetectionStats;
  formatDate: (value: string | null | undefined) => string;
}

const DetectionStats = ({ stats, formatDate }: DetectionStatsProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-md border-border/70 bg-card/80 p-3 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("dashboard.stats.total")}
        </p>
        <p className="text-xl font-semibold">{stats.total}</p>
      </Card>
      <Card className="rounded-md border-border/70 bg-card/80 p-3 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("dashboard.stats.healthy")}
        </p>
        <p className="text-xl font-semibold text-green-500">{stats.healthy}</p>
      </Card>
      <Card className="rounded-md border-border/70 bg-card/80 p-3 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("dashboard.stats.diseased")}
        </p>
        <p className="text-xl font-semibold text-primary">{stats.diseased}</p>
      </Card>
      <Card className="rounded-md border-border/70 bg-card/80 p-3 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("dashboard.stats.lastDetection")}
        </p>
        <p className="text-xl font-semibold text-foreground">
          {formatDate(stats.lastDetection)}
        </p>
      </Card>
    </div>
  );
};

export default DetectionStats;
