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
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
  isDeleting: boolean;
  itemType: "detections" | "images";
}

const BulkDeleteDialog = ({
  open,
  onOpenChange,
  onConfirm,
  count,
  isDeleting,
  itemType,
}: BulkDeleteDialogProps) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("admin.confirmBulkDeleteTitle", { count })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.confirmBulkDeleteDesc", { 
              count, 
              type: itemType === "detections" 
                ? t("admin.detections").toLowerCase() 
                : t("admin.detectionImages").toLowerCase() 
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("modal.close")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("admin.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeleteDialog;
