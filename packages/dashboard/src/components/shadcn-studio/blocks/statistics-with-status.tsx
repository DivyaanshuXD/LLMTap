import type * as React from "react";
import {
  MinusIcon,
  ShieldAlertIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

export type StatisticsCardProps = {
  value: string;
  title: string;
  status: "within" | "observe" | "exceed" | "unknown";
  className?: string;
  range: string;
  icon?: React.ReactNode;
};

const statusConfig = {
  within: {
    color: "bg-green-600/10 dark:bg-green-400/10 text-green-600 dark:text-green-400",
    icon: <TrendingUpIcon />,
    label: "On Track",
  },
  observe: {
    color: "bg-amber-600/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
    icon: <MinusIcon />,
    label: "Stable",
  },
  exceed: {
    color: "bg-destructive/10 text-destructive",
    icon: <TrendingDownIcon />,
    label: "At Risk",
  },
  unknown: {
    color: "bg-sky-600/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400",
    icon: <ShieldAlertIcon />,
    label: "Under Review",
  },
} as const;

export default function StatisticsWithStatus({
  status,
  value,
  title,
  className,
  range,
  icon,
}: StatisticsCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-1.5 rounded-lg border border-white/10 bg-white/4 shadow-sm px-4 py-3 min-h-[96px]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {icon && (
          <div className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md [&>svg]:size-3.5">
            {icon}
          </div>
        )}
      </div>

      <p className="text-3xl leading-none font-semibold tracking-tight">{value}</p>

      <Badge
        className={cn(
          statusConfig[status].color,
          "gap-1.5 w-fit text-xs font-medium [&>svg]:size-3"
        )}
      >
        {statusConfig[status].icon}
        <span>{statusConfig[status].label}:</span>
        <span>{range}</span>
      </Badge>
    </div>
  );
}