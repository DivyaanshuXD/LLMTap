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
    color: "bg-[#66FCF1]/10 text-[#66FCF1]",
    icon: <TrendingUpIcon />,
    label: "On Track",
  },
  observe: {
    color: "bg-[#45A29E]/10 text-[#45A29E]",
    icon: <MinusIcon />,
    label: "Stable",
  },
  exceed: {
    color: "bg-[#C5C6C7]/10 text-[#C5C6C7]",
    icon: <TrendingDownIcon />,
    label: "At Risk",
  },
  unknown: {
    color: "bg-[#1F2833] text-[#C5C6C7]",
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
        "flex flex-col justify-center gap-1.5 rounded-[var(--radius-panel)] border border-white/10 bg-white/4 shadow-sm px-4 py-3 min-h-[96px]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {icon && (
          <div className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-2xl [&>svg]:size-3.5">
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
