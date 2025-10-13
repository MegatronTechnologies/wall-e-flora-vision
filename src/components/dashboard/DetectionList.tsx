import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DetectCard from "@/components/DetectCard";
import type { Detection } from "@/types/detection";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface DetectionListProps {
  detections: Detection[];
  loading: boolean;
  onRetry: () => void;
  paginatedDetections: Detection[];
  currentPage: number;
  pageSize: number;
  onDelete: (detection: Detection) => void;
  deletingId: string | null;
}

const DetectionList = ({
  detections,
  loading,
  onRetry,
  paginatedDetections,
  currentPage,
  pageSize,
  onDelete,
  deletingId,
}: DetectionListProps) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx} className="space-y-4 bg-card p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (detections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-lg font-semibold">{t("dashboard.noDetections", { defaultValue: "No detections yet." })}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t("dashboard.noDetectionsHint", {
            defaultValue: "Press Detect to capture a new snapshot or ensure the Raspberry Pi is connected.",
          })}
        </p>
        <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          {t("common.retry", { defaultValue: "Retry" })}
        </Button>
      </div>
    );
  }

  if (paginatedDetections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-lg font-semibold">{t("dashboard.noDetections", { defaultValue: "No detections yet." })}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t("dashboard.noDetectionsHint", {
            defaultValue: "Try changing the filters or triggering a new detection.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {paginatedDetections.map((detection, idx) => (
        <DetectCard
          key={detection.id}
          detection={detection}
          index={(currentPage - 1) * pageSize + idx}
          onDelete={onDelete}
          deleting={deletingId === detection.id}
        />
      ))}
    </div>
  );
};

export default DetectionList;
