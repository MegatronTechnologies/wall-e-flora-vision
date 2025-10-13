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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("dashboard.stats.total")}</p>
        <p className="text-2xl font-bold">{stats.total}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("dashboard.stats.healthy")}</p>
        <p className="text-2xl font-bold text-green-500">{stats.healthy}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("dashboard.stats.diseased")}</p>
        <p className="text-2xl font-bold text-primary">{stats.diseased}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("dashboard.stats.lastDetection")}</p>
        <p className="text-2xl font-bold text-foreground">{formatDate(stats.lastDetection)}</p>
      </Card>
    </div>
  );
};

export default DetectionStats;
