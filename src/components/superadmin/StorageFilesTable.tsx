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
  deleteStorageFile, 
  bulkDeleteStorageFiles,
  type StorageFile 
} from "@/integrations/supabase/admin-data";
import { toast } from "sonner";

interface StorageFilesTableProps {
  files: StorageFile[];
  loading: boolean;
  onRefresh: () => void;
}

const StorageFilesTable = ({ files, loading, onRefresh }: StorageFilesTableProps) => {
  const { t } = useTranslation();
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const toggleSelectAll = () => {
    if (selectedNames.length === files.length) {
      setSelectedNames([]);
    } else {
      setSelectedNames(files.map(file => file.name));
    }
  };

  const toggleSelect = (name: string) => {
    setSelectedNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleDelete = async (fileName: string) => {
    setDeletingName(fileName);
    try {
      await deleteStorageFile(fileName);
      toast.success(t("dashboard.deleteSuccess"));
      onRefresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("dashboard.deleteError"));
    } finally {
      setDeletingName(null);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDeleteStorageFiles(selectedNames);
      toast.success(t("admin.bulkDeleteSuccess", { count: selectedNames.length }));
      setSelectedNames([]);
      setShowBulkDelete(false);
      onRefresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(t("admin.bulkDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <div className="space-y-4">
        {selectedNames.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              {t("admin.selectedItems", { count: selectedNames.length })}
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
                    checked={selectedNames.length === files.length && files.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label={t("admin.selectAll")}
                  />
                </TableHead>
                <TableHead>{t("admin.fileName")}</TableHead>
                <TableHead>{t("admin.preview")}</TableHead>
                <TableHead>{t("admin.fileSize")}</TableHead>
                <TableHead>{t("dashboard.date")}</TableHead>
                <TableHead className="text-right">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.loading")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : files.length > 0 ? (
                files.map((file, index) => (
                  <motion.tr
                    key={file.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-secondary/30"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedNames.includes(file.name)}
                        onCheckedChange={() => toggleSelect(file.name)}
                        aria-label={`Select ${file.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-xs truncate">
                      {file.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(file.metadata?.size || 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(file.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(file.name)}
                        disabled={deletingName === file.name}
                      >
                        {deletingName === file.name ? (
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
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t("admin.noFiles")}
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
        count={selectedNames.length}
        isDeleting={isDeleting}
        itemType="images"
      />
    </>
  );
};

export default StorageFilesTable;
