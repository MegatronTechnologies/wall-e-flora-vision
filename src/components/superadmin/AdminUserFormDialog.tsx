import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RoleOption } from "@/integrations/supabase/admin";

export interface FormState {
  id?: string;
  email: string;
  full_name: string;
  role: RoleOption;
}

interface AdminUserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formState: FormState;
  onFormStateChange: (partial: Partial<FormState>) => void;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}

const AdminUserFormDialog = ({
  isOpen,
  onOpenChange,
  formState,
  onFormStateChange,
  password,
  confirmPassword,
  showPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPassword,
  onSubmit,
  saving,
}: AdminUserFormDialogProps) => {
  const { t } = useTranslation();
  const isEdit = Boolean(formState.id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("admin.editUserTitle") : t("admin.createUserTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("admin.editUserSubtitle") : t("admin.createUserSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("admin.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              value={formState.email}
              onChange={(event) => onFormStateChange({ email: event.target.value })}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">{t("admin.fullName")}</Label>
            <Input
              id="full_name"
              value={formState.full_name}
              onChange={(event) => onFormStateChange({ full_name: event.target.value })}
              disabled={saving}
            />
          </div>

          {!isEdit && (
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="password">{t("admin.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    disabled={saving}
                    placeholder={t("admin.passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs uppercase"
                    onClick={onToggleShowPassword}
                    aria-label={t("admin.togglePassword")}
                  >
                    {showPassword ? t("admin.hide") : t("admin.show")}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">{t("admin.confirmPassword")}</Label>
                <Input
                  id="confirm_password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => onConfirmPasswordChange(event.target.value)}
                  disabled={saving}
                  placeholder={t("admin.passwordPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("admin.passwordHint")}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">{t("admin.role")}</Label>
            <Select
              value={formState.role}
              onValueChange={(value) => onFormStateChange({ role: value as RoleOption })}
              disabled={saving}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder={t("admin.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t("admin.roles.user")}</SelectItem>
                <SelectItem value="superadmin">{t("admin.roles.superadmin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("modal.close")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t("admin.saveChanges") : t("admin.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserFormDialog;
