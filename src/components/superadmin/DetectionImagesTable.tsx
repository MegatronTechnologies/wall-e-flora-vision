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
import { Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import BulkDeleteDialog from "./BulkDeleteDialog";
import { 
  deleteDetectionImage, 
  bulkDeleteDetectionImages,
  type DetectionImage 
} from "@/integrations/supabase/admin-data";
import { toast } from "sonner";

interface DetectionImagesTableProps {
  images: DetectionImage[];
  loading: boolean;
  onRefresh: () => void;
}

const DetectionImagesTable = ({ images, loading, onRefresh }: DetectionImagesTableProps) => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === images.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(images.map(img => img.id));
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
      await deleteDetectionImage(id);
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
      await bulkDeleteDetectionImages(selectedIds);
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
                    checked={selectedIds.length === images.length && images.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label={t("admin.selectAll")}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>{t("admin.imagePreview")}</TableHead>
                <TableHead>{t("admin.detectionId")}</TableHead>
                <TableHead>{t("admin.orderNum")}</TableHead>
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
              ) : images.length > 0 ? (
                images.map((image, index) => (
                  <motion.tr
                    key={image.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-secondary/30"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(image.id)}
                        onCheckedChange={() => toggleSelect(image.id)}
                        aria-label={`Select ${image.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {image.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                        {image.image_url ? (
                          <img
                            src={image.image_url}
                            alt={`Plant ${image.order_num}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {image.detection_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{image.order_num}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(image.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(image.id)}
                        disabled={deletingId === image.id}
                      >
                        {deletingId === image.id ? (
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
                    {t("admin.noImages")}
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
        itemType="images"
      />
    </>
  );
};

export default DetectionImagesTable;
