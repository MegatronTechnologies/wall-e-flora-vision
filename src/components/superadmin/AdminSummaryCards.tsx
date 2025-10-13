import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export interface AdminSummary {
  total: number;
  admins: number;
  users: number;
}

interface AdminSummaryCardsProps {
  summary: AdminSummary;
}

const AdminSummaryCards = ({ summary }: AdminSummaryCardsProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("admin.totalUsers")}</p>
        <p className="text-2xl font-bold">{summary.total}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("admin.adminsCount")}</p>
        <p className="text-2xl font-bold text-primary">{summary.admins}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("admin.usersCount")}</p>
        <p className="text-2xl font-bold">{summary.users}</p>
      </Card>
    </div>
  );
};

export default AdminSummaryCards;
