import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AdminUser } from "@/integrations/supabase/admin";

interface AdminUsersTableProps {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  deletingId: string | null;
}

const AdminUsersTable = ({ users, loading, onEdit, onDelete, deletingId }: AdminUsersTableProps) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-secondary/50">
            <TableHead>{t("admin.userId")}</TableHead>
            <TableHead>{t("admin.name")}</TableHead>
            <TableHead>{t("admin.email")}</TableHead>
            <TableHead>{t("admin.role")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("admin.dateCreated")}</TableHead>
            <TableHead className="text-right">{t("admin.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TooltipProvider>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-secondary/30"
                >
                  <TableCell className="font-mono font-semibold text-primary">{user.id}</TableCell>
                  <TableCell className="font-medium">{user.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === "superadmin"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {t(`admin.roles.${user.role}`)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {new Date(user.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-secondary hover:text-primary"
                          aria-label={t("admin.edit")}
                          onClick={() => onEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("admin.edit")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t("admin.delete")}
                          onClick={() => onDelete(user)}
                          disabled={deletingId === user.id}
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("admin.delete")}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("admin.emptyState")}
                </TableCell>
              </TableRow>
            )}
          </TooltipProvider>
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminUsersTable;
