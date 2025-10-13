import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser, RoleOption } from "@/integrations/supabase/admin";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "@/integrations/supabase/admin";
import AdminSummaryCards, { type AdminSummary } from "@/components/superadmin/AdminSummaryCards";
import AdminControls from "@/components/superadmin/AdminControls";
import AdminUsersTable from "@/components/superadmin/AdminUsersTable";
import AdminUserFormDialog, { type FormState } from "@/components/superadmin/AdminUserFormDialog";
import AdminDeleteDialog from "@/components/superadmin/AdminDeleteDialog";
import AdminInfoAlerts from "@/components/superadmin/AdminInfoAlerts";
import { logger } from "@/lib/logger";

const SuperAdminPanel = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleOption>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>({ email: "", full_name: "", role: "user" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [authRequired, setAuthRequired] = useState(false);
  const [edgeUnavailable, setEdgeUnavailable] = useState(false);

  const resetForm = useCallback(() => {
    setFormState({ email: "", full_name: "", role: "user" });
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, []);

  const updateFormState = (partial: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...partial }));
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    logger.debug("SuperAdminPanel", "Loading users from Supabase");
    try {
      const result = await fetchAdminUsers();
      setUsers(result);
      setAuthRequired(false);
      setEdgeUnavailable(false);
      logger.info("SuperAdminPanel", `Fetched ${result.length} users`);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        logger.warn("SuperAdminPanel", "Authentication required to load users");
        setAuthRequired(true);
      } else if (error instanceof Error && error.message === "EDGE_FUNCTION_UNREACHABLE") {
        logger.warn("SuperAdminPanel", "Edge function is unreachable during load");
        setEdgeUnavailable(true);
      } else {
        logger.error("SuperAdminPanel", "Failed to load admin users", error);
        toast({
          title: t("common.error", { defaultValue: "Xəta baş verdi" }),
          description: t("admin.loadError", { defaultValue: "İstifadəçilər yüklənmədi" }),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const summary: AdminSummary = useMemo(() => {
    const total = users.length;
    const admins = users.filter((user) => user.role === "superadmin").length;
    const regularUsers = total - admins;
    return { total, admins, users: regularUsers };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return [...users]
      .filter((user) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          user.full_name?.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      });
  }, [users, searchTerm, roleFilter, sortDirection]);

  const handleToggleSort = () => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));

  const handleCreateOpen = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditOpen = (user: AdminUser) => {
    setFormState({ id: user.id, email: user.email, full_name: user.full_name ?? "", role: user.role });
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    if (authRequired) {
      toast({
        title: t("common.error"),
        description: t("admin.authRequired"),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (!formState.id) {
      if (password.length < 6) {
        toast({ title: t("common.error"), description: t("auth.passwordTooShort"), variant: "destructive" });
        setSaving(false);
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: t("common.error"), description: t("auth.passwordMismatch"), variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        email: formState.email.trim(),
        full_name: formState.full_name.trim() || null,
        role: formState.role,
      };

      let updated: AdminUser;
      if (formState.id) {
        updated = await updateAdminUser({ id: formState.id, ...payload });
        setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
        toast({ title: t("admin.updateSuccess"), description: t("admin.updateSuccessDesc") });
      } else {
        updated = await createAdminUser({ ...payload, password });
        setUsers((prev) => [updated, ...prev]);
        toast({ title: t("admin.createSuccess"), description: t("admin.createSuccessDesc") });
      }

      resetForm();
      setIsFormOpen(false);
    } catch (error) {
      logger.error("SuperAdminPanel", "Failed to save user", error);
      const isEdgeUnavailable = error instanceof Error && error.message === "EDGE_FUNCTION_UNREACHABLE";
      if (isEdgeUnavailable) {
        setEdgeUnavailable(true);
      }
      toast({
        title: t("common.error"),
        description: isEdgeUnavailable ? t("admin.edgeFunctionUnavailable") : t("admin.saveError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (user: AdminUser) => {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteAdminUser(deleteTarget.id);
      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id));
      toast({ title: t("admin.deleteSuccess"), description: t("admin.deleteSuccessDesc") });
    } catch (error) {
      logger.error("SuperAdminPanel", "Failed to delete user", error);
      const isEdgeUnavailable = error instanceof Error && error.message === "EDGE_FUNCTION_UNREACHABLE";
      if (isEdgeUnavailable) {
        setEdgeUnavailable(true);
      }
      toast({
        title: t("common.error"),
        description: isEdgeUnavailable ? t("admin.edgeFunctionUnavailable") : t("admin.deleteError"),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pb-12 pt-24">
        <div className="container mx-auto max-w-7xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold">{t("admin.title")}</h1>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <AdminSummaryCards summary={summary} />
          </motion.div>

          <AdminInfoAlerts authRequired={authRequired} edgeUnavailable={edgeUnavailable} />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <AdminControls
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              sortDirection={sortDirection}
              onToggleSort={handleToggleSort}
              onCreate={handleCreateOpen}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <AdminUsersTable
              users={filteredUsers}
              loading={loading}
              onEdit={handleEditOpen}
              onDelete={handleDeleteRequest}
              deletingId={deletingId}
            />
          </motion.div>
        </div>
      </div>

      <AdminUserFormDialog
        isOpen={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
        }}
        formState={formState}
        onFormStateChange={updateFormState}
        password={password}
        confirmPassword={confirmPassword}
        showPassword={showPassword}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        onSubmit={handleFormSubmit}
        saving={saving}
      />

      <AdminDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        processing={deletingId !== null}
        email={deleteTarget?.email}
      />
    </div>
  );
};

export default SuperAdminPanel;
