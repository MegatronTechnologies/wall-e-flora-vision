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

const Detector = ({ stats, formatDate }: DetectionStatsProps) => {
  const { t } = useTranslation();

  const items = [
    {
      label: t("dashboard.stats.total"),
      value: stats.total,
    },
    {
      label: t("dashboard.stats.healthy"),
      value: stats.healthy,
      accent: "text-emerald-500",
    },
    {
      label: t("dashboard.stats.diseased"),
      value: stats.diseased,
      accent: "text-primary",
    },
    {
      label: t("dashboard.stats.lastDetection"),
      value: formatDate(stats.lastDetection),
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, accent }) => (
        <Card key={label} className="rounded-sm border-border/60 bg-card/70 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className={`text-lg font-medium ${accent ?? "text-foreground"}`}>{value}</p>
        </Card>
      ))}
    </div>
  );
};

export default Detector;
