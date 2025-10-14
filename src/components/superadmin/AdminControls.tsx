import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, ArrowUpDown, UserPlus } from "lucide-react";

type RoleFilter = "all" | string;
type SortDirection = "asc" | "desc";

interface AdminControlsProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: Dispatch<SetStateAction<RoleFilter>>;
  sortDirection: SortDirection;
  onToggleSort: () => void;
  onCreate: () => void;
}

const AdminControls = ({
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  sortDirection,
  onToggleSort,
  onCreate,
}: AdminControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.searchPlaceholder")}
            className="pl-9"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(value as RoleFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("admin.allRoles")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
              <SelectItem value="user">{t("admin.roles.user")}</SelectItem>
              <SelectItem value="superadmin">{t("admin.roles.superadmin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Button variant="outline" className="gap-2" onClick={onToggleSort}>
          <ArrowUpDown className="h-4 w-4" />
          {sortDirection === "asc" ? t("admin.sortOldest") : t("admin.sortNewest")}
        </Button>
        <Button className="gap-2" onClick={onCreate}>
          <UserPlus className="h-5 w-5" />
          {t("admin.create")}
        </Button>
      </div>
    </div>
  );
};

export default AdminControls;
