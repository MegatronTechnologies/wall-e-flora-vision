import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import DetectCard from "@/components/DetectCard";
import Modal from "@/components/Modal";
import { Video, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeDetection } from "@/lib/detections";
import type { Detection, DetectionQueryResult, DetectionStatus } from "@/types/detection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;
const DETECT_ENDPOINT = import.meta.env.VITE_PI_DETECT_URL ?? "";

const Dashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | DetectionStatus>("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetecting, setIsDetecting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Detection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDetections = useCallback(async () => {
    logger.debug("Dashboard", "Fetching detections");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("detections")
        .select(
          `*,
          plant_images:detection_images(image_url, order_num)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data ?? []).map((row) => normalizeDetection(row as DetectionQueryResult));
      setDetections(normalized);
      logger.info("Dashboard", `Loaded ${normalized.length} detections`);
    } catch (error) {
      logger.error("Dashboard", "Error fetching detections", error);
      toast({
        title: t("common.error"),
        description: t("dashboard.loadError", { defaultValue: "Failed to load detections" }),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    logger.info("Dashboard", "Initializing dashboard page");
    fetchDetections();

    const channel = supabase
      .channel("detections-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "detections",
        },
        () => {
          logger.debug("Dashboard", "Realtime INSERT received, refreshing detections");
          fetchDetections().then(() => setCurrentPage(1));
          toast({
            title: t("dashboard.newDetection", { defaultValue: "New detection received" }),
            description: t("dashboard.newDetectionDescription", { defaultValue: "A new detection has been added." }),
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDetections, toast, t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, deviceFilter, timeFilter, searchTerm]);

  const uniqueDevices = useMemo(() => {
    const devices = new Set<string>();
    detections.forEach((detection) => {
      if (detection.device_id) devices.add(detection.device_id);
    });
    return Array.from(devices).sort();
  }, [detections]);

  const stats = useMemo(() => {
    const total = detections.length;
    const healthy = detections.filter((d) => d.status === "healthy").length;
    const diseased = detections.filter((d) => d.status === "diseased").length;
    const noObjects = detections.filter((d) => d.status === "noObjects").length;
    const latest = detections[0]?.created_at ?? null;
    return { total, healthy, diseased, noObjects, latest };
  }, [detections]);

  const filteredDetections = useMemo(() => {
    const lowercaseSearch = searchTerm.trim().toLowerCase();
    const now = Date.now();
    return detections.filter((detection) => {
      if (statusFilter !== "all" && detection.status !== statusFilter) {
        return false;
      }

      if (deviceFilter !== "all" && detection.device_id !== deviceFilter) {
        return false;
      }

      if (timeFilter !== "all") {
        const createdAt = new Date(detection.created_at).getTime();
        const diff = now - createdAt;
        if (timeFilter === "24h" && diff > 24 * 60 * 60 * 1000) {
          return false;
        }
        if (timeFilter === "7d" && diff > 7 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      if (lowercaseSearch) {
        const metadataValues = Object.values(detection.metadata ?? {}).join(" ").toLowerCase();
        const matchesSearch =
          detection.id.toLowerCase().includes(lowercaseSearch) ||
          detection.device_id.toLowerCase().includes(lowercaseSearch) ||
          metadataValues.includes(lowercaseSearch);
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [detections, deviceFilter, statusFilter, timeFilter, searchTerm]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredDetections.length / PAGE_SIZE)), [filteredDetections.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDetections = useMemo(
    () => filteredDetections.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredDetections, currentPage],
  );

  const handleDetect = async () => {
    logger.debug("Dashboard", "Detect action triggered");
    if (!DETECT_ENDPOINT) {
      toast({
        title: t("common.error"),
        description: t("dashboard.detectEndpointMissing", { defaultValue: "Detection endpoint is not configured." }),
        variant: "destructive",
      });
      return;
    }

    setIsDetecting(true);
    try {
      const response = await fetch(DETECT_ENDPOINT, { method: "POST" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fetchDetections();
      setCurrentPage(1);
      toast({
        title: t("dashboard.detectSuccess", { defaultValue: "Detection requested" }),
        description: t("dashboard.detectSuccessDescription", { defaultValue: "New detection will appear shortly." }),
      });
    } catch (error) {
      logger.error("Dashboard", "Detect request failed", error);
      toast({
        title: t("common.error"),
        description: t("dashboard.detectError", { defaultValue: "Failed to trigger detection." }),
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleStream = () => {
    logger.debug("Dashboard", "Scan action triggered");
    setIsStreamModalOpen(true);
  };

  const handleDeleteRequest = (detection: Detection) => {
    setDeleteTarget(detection);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmation = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await supabase.from("detection_images").delete().eq("detection_id", deleteTarget.id);
      await supabase.from("detections").delete().eq("id", deleteTarget.id);
      setDetections((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast({
        title: t("dashboard.deleteSuccess", { defaultValue: "Detection deleted" }),
        description: t("dashboard.deleteSuccessDescription", { defaultValue: "The detection has been removed." }),
      });
    } catch (error) {
      logger.error("Dashboard", "Failed to delete detection", error);
      toast({
        title: t("common.error"),
        description: t("dashboard.deleteError", { defaultValue: "Failed to delete detection." }),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return t("common.notAvailable", { defaultValue: "—" });
    return new Date(value).toLocaleString();
  };

  const statusOptions: Array<{ value: "all" | DetectionStatus; label: string }> = useMemo(
    () => [
      { value: "all", label: t("dashboard.allStatuses", { defaultValue: "All statuses" }) },
      { value: "noObjects", label: t("dashboard.noObjects") },
      { value: "healthy", label: t("dashboard.healthy") },
      { value: "diseased", label: t("dashboard.diseased") },
      { value: "mixed", label: t("dashboard.mixed") },
    ],
    [t],
  );

  const timeOptions: Array<{ value: "all" | "24h" | "7d"; label: string }> = useMemo(
    () => [
      { value: "all", label: t("dashboard.time.all", { defaultValue: "All time" }) },
      { value: "24h", label: t("dashboard.time.last24h", { defaultValue: "Last 24 hours" }) },
      { value: "7d", label: t("dashboard.time.last7d", { defaultValue: "Last 7 days" }) },
    ],
    [t],
  );

  const renderPagination = () => {
    if (filteredDetections.length === 0 || totalPages <= 1) {
      return null;
    }

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (currentPage > 1) {
                  handlePageChange(currentPage - 1);
                }
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(event) => {
                  event.preventDefault();
                  handlePageChange(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (currentPage < totalPages) {
                  handlePageChange(currentPage + 1);
                }
              }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderDetectionList = () => {
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

    if (paginatedDetections.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-lg font-semibold">{t("dashboard.noDetections", { defaultValue: "No detections yet." })}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("dashboard.noDetectionsHint", {
              defaultValue: "Press Detect to capture a new snapshot or ensure the Raspberry Pi is connected.",
            })}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedDetections.map((detection, index) => (
          <DetectCard
            key={detection.id}
            detection={detection}
            index={(currentPage - 1) * PAGE_SIZE + index}
            onDelete={handleDeleteRequest}
            deleting={deletingId === detection.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="px-4 pb-12 pt-24">
        <div className="container mx-auto max-w-6xl space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
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
              <p className="text-2xl font-bold text-foreground">{formatDate(stats.latest)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleStream}
                    className="bg-secondary hover:bg-secondary/80 gap-3 text-2xl px-6 py-5"
                  >
                    <Video className="h-6 w-6" />
                    {t("dashboard.scan", { defaultValue: "Scan" })}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder={t("dashboard.searchPlaceholder", { defaultValue: "Search detections" })}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("dashboard.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deviceFilter} onValueChange={(value) => setDeviceFilter(value as typeof deviceFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("dashboard.filterByDevice", { defaultValue: "Filter by device" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.devices.all", { defaultValue: "All devices" })}</SelectItem>
                  {uniqueDevices.map((device) => (
                    <SelectItem key={device} value={device}>
                      {device}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as typeof timeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("dashboard.time.filter", { defaultValue: "Filter by time" })} />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t("dashboard.previousDetects")}</h2>
            {renderDetectionList()}
            {renderPagination()}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.deleteConfirmTitle", { defaultValue: "Delete detection?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteConfirmDescription", {
                defaultValue: "This detection will be permanently removed.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              {t("modal.close")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirmation}
              disabled={deletingId !== null}
            >
              {deletingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.delete", { defaultValue: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal
        isOpen={isStreamModalOpen}
        onClose={() => setIsStreamModalOpen(false)}
        title={t("dashboard.liveStream", { defaultValue: "Live Stream" })}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <div className="absolute right-3 top-3 z-10">
            <Button
              size="sm"
              onClick={handleDetect}
              disabled={isDetecting}
              className="bg-primary hover:bg-primary/90 text-base"
            >
              {isDetecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.detect")}
            </Button>
          </div>
          {import.meta.env.VITE_STREAM_URL ? (
            <iframe
              src={import.meta.env.VITE_STREAM_URL}
              title="Raspberry Pi Stream"
              className="h-full w-full"
              allow="autoplay"
            />
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
    </div>
  );
};

export default Dashboard;
