import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface DetectionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusOptions: Array<Option<string>>;
  statusValue: string;
  onStatusChange: (value: string) => void;
  deviceOptions: Array<Option<string>>;
  deviceValue: string;
  onDeviceChange: (value: string) => void;
  timeOptions: Array<Option<string>>;
  timeValue: string;
  onTimeChange: (value: string) => void;
}

const DetectionFilters = ({
  searchTerm,
  onSearchChange,
  statusOptions,
  statusValue,
  onStatusChange,
  deviceOptions,
  deviceValue,
  onDeviceChange,
  timeOptions,
  timeValue,
  onTimeChange,
}: DetectionFiltersProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder={t("dashboard.searchPlaceholder", { defaultValue: "Search" })}
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        className="w-full sm:w-60"
      />
      <Select value={statusValue} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("dashboard.filterByStatus")} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={deviceValue} onValueChange={onDeviceChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("dashboard.filterByDevice", { defaultValue: "Device" })} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("dashboard.devices.all", { defaultValue: "All devices" })}</SelectItem>
          {deviceOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={timeValue} onValueChange={onTimeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("dashboard.time.filter", { defaultValue: "Time" })} />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DetectionFilters;
