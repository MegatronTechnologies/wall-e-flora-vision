import { useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Detection } from "@/types/detection";
import { Badge } from "@/components/ui/badge";
import BulkDeleteDialog from "./BulkDeleteDialog";
import { deleteDetection, bulkDeleteDetections } from "@/integrations/supabase/admin-data";
import { toast } from "sonner";

interface DetectionsTableProps {
  detections: Detection[];
  loading: boolean;
  onRefresh: () => void;
}

const DetectionsTable = ({ detections, loading, onRefresh }: DetectionsTableProps) => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === detections.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(detections.map(d => d.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDetection(id);
      toast.success(t("dashboard.deleteSuccess"));
      onRefresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("dashboard.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDeleteDetections(selectedIds);
      toast.success(t("admin.bulkDeleteSuccess", { count: selectedIds.length }));
      setSelectedIds([]);
      setShowBulkDelete(false);
      onRefresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(t("admin.bulkDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      healthy: "default",
      diseased: "destructive",
      mixed: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {t(`dashboard.${status}`)}
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              {t("admin.selectedItems", { count: selectedIds.length })}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("admin.bulkDelete")}
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-secondary/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === detections.length && detections.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label={t("admin.selectAll")}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>{t("dashboard.device")}</TableHead>
                <TableHead>{t("dashboard.status")}</TableHead>
                <TableHead>{t("dashboard.confidence")}</TableHead>
                <TableHead>{t("dashboard.date")}</TableHead>
                <TableHead className="text-right">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.loading")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : detections.length > 0 ? (
                detections.map((detection, index) => (
                  <motion.tr
                    key={detection.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-secondary/30"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(detection.id)}
                        onCheckedChange={() => toggleSelect(detection.id)}
                        aria-label={`Select ${detection.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {detection.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{detection.device_id}</TableCell>
                    <TableCell>{getStatusBadge(detection.status)}</TableCell>
                    <TableCell>
                      {detection.confidence ? `${(detection.confidence * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(detection.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(detection.id)}
                        disabled={deletingId === detection.id}
                      >
                        {deletingId === detection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {t("dashboard.noDetections")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <BulkDeleteDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        isDeleting={isDeleting}
        itemType="detections"
      />
    </>
  );
};

export default DetectionsTable;
