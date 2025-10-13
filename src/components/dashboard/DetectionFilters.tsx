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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Input
        placeholder={t("dashboard.searchPlaceholder", { defaultValue: "Search detections" })}
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Select value={statusValue} onValueChange={onStatusChange}>
        <SelectTrigger>
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
        <SelectTrigger>
          <SelectValue placeholder={t("dashboard.filterByDevice", { defaultValue: "Filter by device" })} />
        </SelectTrigger>
        <SelectContent>
          {deviceOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={timeValue} onValueChange={onTimeChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("dashboard.time.filter", { defaultValue: "Filter by time" })} />
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
