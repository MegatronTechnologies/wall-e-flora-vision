import { useMemo, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import Modal from "@/components/Modal";
import type { Detection } from "@/types/detection";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface DetectCardProps {
  detection: Detection;
  index: number;
  onDelete?: (detection: Detection) => void;
  deleting?: boolean;
}

const DetectCard = ({ detection, index, onDelete, deleting = false }: DetectCardProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageVersion, setImageVersion] = useState(() => Date.now());
  const metadataEntries = useMemo(
    () => Object.entries(detection.metadata ?? {}).filter(([, value]) => value !== undefined && value !== null),
    [detection.metadata],
  );
  const mainImageSrc = useMemo(() => {
    if (!detection.image_url) return "";
    const separator = detection.image_url.includes("?") ? "&" : "?";
    return `${detection.image_url}${separator}v=${imageVersion}`;
  }, [detection.image_url, imageVersion]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const displayId = `#${detection.id.substring(0, 8)}`;
  const { status } = detection;
  const confidence = detection.confidence ?? undefined;
  const deviceIdDisplay = detection.device_id;

  const statusColors: Record<Detection["status"], string> = {
    noObjects: "text-info",
    healthy: "text-green-500",
    diseased: "text-primary",
    mixed: "text-yellow-500",
  };

  const statusBgColors: Record<Detection["status"], string> = {
    noObjects: "bg-info/10",
    healthy: "bg-green-500/10",
    diseased: "bg-primary/10",
    mixed: "bg-yellow-500/10",
  };

  const handleRefreshImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    logger.debug("DetectCard", "Refreshing main image", detection.id);
    setImageVersion(Date.now());
  };

  const formatMetadataLabel = (key: string) =>
    t(`dashboard.metadata.${key}`, { defaultValue: key.charAt(0).toUpperCase() + key.slice(1) });

  const openModal = () => {
    logger.debug("DetectCard", "Opening detection modal", detection.id);
    setIsModalOpen(true);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onDelete) {
      logger.debug("DetectCard", "Delete requested", detection.id);
      onDelete(detection);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.02 }}
        onClick={openModal}
        className="cursor-pointer"
      >
        <Card className="bg-card border-border p-6 transition-all hover:border-primary">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">{t("dashboard.detectId")}</div>
              <div className="font-mono text-lg font-bold text-primary">{displayId}</div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("dashboard.date")}</span>
                <span>{formatDate(detection.created_at)}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("dashboard.status")}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[status]} ${statusBgColors[status]}`}>
                  {t(`dashboard.${status}`)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{t("dashboard.device", { defaultValue: "Device" })}</span>
                <span className="font-medium">{deviceIdDisplay}</span>
              </div>
            </div>

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deleting}
                className="-mt-2 text-destructive hover:text-destructive"
                aria-label={t("dashboard.delete", { defaultValue: "Delete" })}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${t("dashboard.details")} - ${displayId}`}
      >
        <div className="space-y-4">
          <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
            {mainImageSrc ? (
              <img
                src={mainImageSrc}
                alt={t("dashboard.detectionImageAlt", { defaultValue: "Detection result" })}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">{t("dashboard.noImage", { defaultValue: "No image available" })}</p>
              </div>
            )}
            {detection.image_url && (
              <Button
                variant="secondary"
                size="icon"
                onClick={handleRefreshImage}
                className="absolute right-3 top-3 bg-background/80 backdrop-blur hover:bg-background"
                aria-label={t("dashboard.refreshImage", { defaultValue: "Refresh image" })}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary p-4">
              <p className="mb-2 text-sm text-muted-foreground">{t("dashboard.status")}</p>
              <p className={`font-semibold ${statusColors[status]}`}>{t(`dashboard.${status}`)}</p>
            </div>

            <div className="rounded-lg bg-secondary p-4">
              <p className="mb-2 text-sm text-muted-foreground">{t("dashboard.confidence")}</p>
              <p className="font-semibold text-primary">
                {typeof confidence === "number"
                  ? `${confidence.toFixed(1)}%`
                  : t("common.notAvailable", { defaultValue: "—" })}
              </p>
            </div>

            <div className="rounded-lg bg-secondary p-4">
              <p className="mb-2 text-sm text-muted-foreground">{t("dashboard.device", { defaultValue: "Device" })}</p>
              <p className="font-semibold">{deviceIdDisplay}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {detection.plant_images.length > 0
              ? detection.plant_images
                  .sort((a, b) => a.order_num - b.order_num)
                  .map((img) => {
                    const plantStatus = detection.metadata?.plant_statuses?.find(
                      (ps) => ps.order_num === img.order_num
                    );
                    const plantStatusColor = plantStatus?.status === "healthy"
                      ? "text-green-500"
                      : plantStatus?.status === "diseased"
                      ? "text-primary"
                      : "text-muted-foreground";

                    return (
                      <div key={img.order_num} className="space-y-2">
                        <div className="aspect-square rounded-lg bg-secondary overflow-hidden">
                          <img src={img.image_url} alt={`Plant ${img.order_num}`} className="h-full w-full object-cover" />
                        </div>
                        {plantStatus && (
                          <div className="text-center space-y-1">
                            <p className={`text-sm font-semibold ${plantStatusColor}`}>
                              {t(`dashboard.${plantStatus.status}`)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {plantStatus.confidence.toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
              : [1, 2, 3].map((placeholder) => (
                  <div
                    key={placeholder}
                    className="flex aspect-square items-center justify-center rounded-lg bg-secondary text-xs text-muted-foreground"
                  >
                    {t("dashboard.plantPlaceholder", { defaultValue: "Plant" })} {placeholder}
                  </div>
                ))}
          </div>

          {metadataEntries.length > 0 && (
            <div className="rounded-lg bg-secondary p-4">
              <p className="mb-2 text-sm text-muted-foreground">
                {t("dashboard.additionalInfo", { defaultValue: "Additional Info" })}
              </p>
              <div className="space-y-1 text-sm">
                {metadataEntries.map(([key, value]) => {
                  const label = formatMetadataLabel(key);
                  return (
                    <p key={key}>
                      {label}: {String(value)}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {onDelete && (
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(detection);
                }}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("dashboard.delete", { defaultValue: "Delete" })}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default DetectCard;
