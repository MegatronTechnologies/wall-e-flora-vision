import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeDetection } from "@/lib/detections";
import type { Detection, DetectionQueryResult, DetectionStatus } from "@/types/detection";
import { logger } from "@/lib/logger";
import DetectionStatsComponent, { type DetectionStats } from "@/components/dashboard/DetectionStats";
import DetectionActions from "@/components/dashboard/DetectionActions";
import DetectionFilters from "@/components/dashboard/DetectionFilters";
import DetectionList from "@/components/dashboard/DetectionList";
import DeleteDetectionDialog from "@/components/dashboard/DeleteDetectionDialog";
import LiveStreamModal from "@/components/dashboard/LiveStreamModal";
import StatusIndicator from "@/components/dashboard/StatusIndicator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;
const PI_DETECT_URL = import.meta.env.VITE_PI_DETECT_URL ?? "";
const PI_STREAM_URL = import.meta.env.VITE_PI_STREAM_URL ?? "";

const Dashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | DetectionStatus>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Detection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [autoOpenDetectionId, setAutoOpenDetectionId] = useState<string | null>(null);
  
  const isWaitingForDetectionRef = useRef(false);

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
    fetchDetections();
    
    const channel = supabase
      .channel("detections-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "detections" }, (payload) => {
        logger.debug("Dashboard", "Realtime INSERT received, refreshing detections", payload);

        // If we're waiting for a detection from the DETECT button
        if (isWaitingForDetectionRef.current && payload.new?.id) {
          setAutoOpenDetectionId(payload.new.id as string);
          isWaitingForDetectionRef.current = false;
        }

        fetchDetections().then(() => setCurrentPage(1));

        // Only show toast if not from DETECT button (to avoid duplicate notifications)
        if (!isWaitingForDetectionRef.current) {
          toast({
            title: t("dashboard.newDetection", { defaultValue: "New detection received" }),
            description: t("dashboard.newDetectionDescription", { defaultValue: "A new detection has been added." }),
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDetections, toast, t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, deviceFilter, timeFilter, searchTerm]);

  // Auto-open modal for new detection after DETECT button
  useEffect(() => {
    if (autoOpenDetectionId && detections.length > 0) {
      const newDetection = detections.find(d => d.id === autoOpenDetectionId);
      if (newDetection) {
        logger.debug("Dashboard", "Auto-opening new detection", autoOpenDetectionId);
        // Programmatically trigger the card click
        // We'll use a timeout to ensure the DOM is updated
        setTimeout(() => {
          const cardElement = document.querySelector(`[data-detection-id="${autoOpenDetectionId}"]`);
          if (cardElement instanceof HTMLElement) {
            cardElement.click();
          }
        }, 300);
        setAutoOpenDetectionId(null);
      }
    }
  }, [autoOpenDetectionId, detections]);

  const uniqueDevices = useMemo(() => {
    const devices = new Set<string>();
    detections.forEach((d) => devices.add(d.device_id));
    return Array.from(devices).sort();
  }, [detections]);

  const stats: DetectionStats = useMemo(() => {
    const total = detections.length;
    const healthy = detections.filter((d) => d.status === "healthy").length;
    const diseased = detections.filter((d) => d.status === "diseased").length;
    const latest = detections[0]?.created_at ?? null;
    return { total, healthy, diseased, lastDetection: latest };
  }, [detections]);

  const filteredDetections = useMemo(() => {
    const lowercaseSearch = searchTerm.trim().toLowerCase();
    const now = Date.now();
    return detections.filter((detection) => {
      if (statusFilter !== "all" && detection.status !== statusFilter) return false;
      if (deviceFilter !== "all" && detection.device_id !== deviceFilter) return false;

      if (timeFilter !== "all") {
        const createdAt = new Date(detection.created_at).getTime();
        const diff = now - createdAt;
        if (timeFilter === "24h" && diff > 24 * 60 * 60 * 1000) return false;
        if (timeFilter === "7d" && diff > 7 * 24 * 60 * 60 * 1000) return false;
      }

      if (lowercaseSearch) {
        const metadataValues = Object.values(detection.metadata ?? {}).join(" ").toLowerCase();
        const matchesSearch =
          detection.id.toLowerCase().includes(lowercaseSearch) ||
          detection.device_id.toLowerCase().includes(lowercaseSearch) ||
          metadataValues.includes(lowercaseSearch);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [detections, statusFilter, deviceFilter, timeFilter, searchTerm]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredDetections.length / PAGE_SIZE)), [filteredDetections.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedDetections = useMemo(
    () => filteredDetections.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredDetections, currentPage],
  );

  const handleDetect = async () => {
    logger.debug("Dashboard", "Detect action triggered");
    setIsDetecting(true);
    isWaitingForDetectionRef.current = true;
    setAutoOpenDetectionId(null);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token is available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${PI_DETECT_URL}/detect`,
        {
          method: "POST",
          headers
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      // Show success toast
      toast({
        title: t("dashboard.detectSuccess", { defaultValue: "Detection successful" }),
        description: t("dashboard.detectProcessing", {
          defaultValue: "Processing detection... New card will appear shortly."
        }),
      });

      // Wait a bit for the Edge Function to process and save to DB
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchDetections();
      setCurrentPage(1);

    } catch (error) {
      logger.error("Dashboard", "Detect request failed", error);
      isWaitingForDetectionRef.current = false;
      
      let errorTitle = t("common.error");
      let errorDescription = t("dashboard.detectError", { defaultValue: "Connection error" });

      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorTitle = t("dashboard.errors.connectionTitle", { defaultValue: "Connection failed" });
        errorDescription = t("dashboard.errors.connectionDesc", { 
          defaultValue: "Cannot reach Raspberry Pi. Check if device is online and network connection is stable." 
        });
      } else if (error instanceof Error && error.message.includes("HTTP 401")) {
        errorTitle = t("dashboard.errors.authTitle", { defaultValue: "Authentication error" });
        errorDescription = t("dashboard.errors.authDesc", { 
          defaultValue: "Session expired. Please refresh the page and login again." 
        });
      } else if (error instanceof Error && error.message.includes("HTTP 500")) {
        errorTitle = t("dashboard.errors.serverTitle", { defaultValue: "Server error" });
        errorDescription = t("dashboard.errors.serverDesc", { 
          defaultValue: "Raspberry Pi encountered an error. Check device logs." 
        });
      } else if (error instanceof Error && error.message.includes("HTTP 404")) {
        errorTitle = t("dashboard.errors.endpointTitle", { defaultValue: "Endpoint not found" });
        errorDescription = t("dashboard.errors.endpointDesc", { 
          defaultValue: "Detection service not available on Raspberry Pi." 
        });
      }

      toast({
        title: errorTitle,
        description: errorDescription,
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

  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("dashboard.allStatuses", { defaultValue: "All statuses" }) },
      { value: "noObjects", label: t("dashboard.noObjects") },
      { value: "healthy", label: t("dashboard.healthy") },
      { value: "diseased", label: t("dashboard.diseased") },
      { value: "mixed", label: t("dashboard.mixed") },
    ],
    [t],
  );

  const deviceOptions = useMemo(() => {
    const base = [{ value: "all", label: t("dashboard.devices.all", { defaultValue: "All devices" }) }];
    return base.concat(uniqueDevices.map((device) => ({ value: device, label: device })));
  }, [t, uniqueDevices]);

  const timeOptions = useMemo(
    () => [
      { value: "all", label: t("dashboard.time.all", { defaultValue: "All time" }) },
      { value: "24h", label: t("dashboard.time.last24h", { defaultValue: "Last 24 hours" }) },
      { value: "7d", label: t("dashboard.time.last7d", { defaultValue: "Last 7 days" }) },
    ],
    [t],
  );

  const renderPagination = () => {
    if (filteredDetections.length === 0 || totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (currentPage > 1) handlePageChange(currentPage - 1);
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
                if (currentPage < totalPages) handlePageChange(currentPage + 1);
              }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="px-4 pb-12 pt-24">
        <div className="container mx-auto max-w-6xl space-y-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <StatusIndicator />
            <DetectionActions onStream={handleStream} onDetect={handleDetect} isDetecting={isDetecting} />
            <DetectionFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusOptions={statusOptions}
              statusValue={statusFilter}
              onStatusChange={(value) => setStatusFilter(value as typeof statusFilter)}
              deviceOptions={deviceOptions}
              deviceValue={deviceFilter}
              onDeviceChange={setDeviceFilter}
              timeOptions={timeOptions}
              timeValue={timeFilter}
              onTimeChange={(value) => setTimeFilter(value as typeof timeFilter)}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <DetectionStatsComponent stats={stats} formatDate={formatDate} />
          </motion.div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t("dashboard.previousDetects")}</h2>
            <DetectionList
              detections={detections}
              loading={loading}
              onRetry={fetchDetections}
              paginatedDetections={paginatedDetections}
              currentPage={currentPage}
              pageSize={PAGE_SIZE}
              onDelete={handleDeleteRequest}
              deletingId={deletingId}
              autoOpenDetectionId={autoOpenDetectionId}
              onAutoOpenComplete={() => setAutoOpenDetectionId(null)}
            />
            {renderPagination()}
          </div>
        </div>
      </div>

      <DeleteDetectionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirmation}
        isProcessing={deletingId !== null}
      />

      <LiveStreamModal
        open={isStreamModalOpen}
        onClose={() => setIsStreamModalOpen(false)}
        onDetect={handleDetect}
        detecting={isDetecting}
        streamUrl={PI_STREAM_URL}
      />
    </div>
  );
};

export default Dashboard;
