import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface AdminInfoAlertsProps {
  authRequired: boolean;
  edgeUnavailable: boolean;
}

const AdminInfoAlerts = ({ authRequired, edgeUnavailable }: AdminInfoAlertsProps) => {
  const { t } = useTranslation();

  if (!authRequired && !edgeUnavailable) return null;

  return (
    <div className="grid gap-4">
      {authRequired && (
        <Card className="border-destructive text-destructive p-4">
          <p className="font-semibold">{t("admin.authRequired")}</p>
          <p className="text-sm text-muted-foreground">{t("admin.authHelp")}</p>
        </Card>
      )}

      {!authRequired && edgeUnavailable && (
        <Card className="border-destructive text-destructive p-4">
          <p className="font-semibold">{t("admin.edgeFunctionUnavailableTitle", { defaultValue: t("admin.edgeFunctionUnavailable") })}</p>
          <p className="text-sm text-muted-foreground">{t("admin.edgeFunctionHelp")}</p>
        </Card>
      )}
    </div>
  );
};

export default AdminInfoAlerts;
