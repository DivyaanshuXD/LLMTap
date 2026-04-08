import type * as React from "react";
import { StatCard } from "@/components/system/StatCard.tsx";

export type StatisticsCardProps = {
  value: string;
  title: string;
  status: "within" | "observe" | "exceed" | "unknown";
  className?: string;
  range: string;
  icon?: React.ReactNode;
};

const statusTrend = {
  within: { direction: "up" as const, value: "Live" },
  observe: { direction: "neutral" as const, value: "Watch" },
  exceed: { direction: "down" as const, value: "Alert" },
  unknown: undefined,
};

export default function StatisticsWithStatus({
  status,
  value,
  title,
  className,
  range,
  icon,
}: StatisticsCardProps) {
  return (
    <StatCard
      label={title}
      value={value}
      subtext={range}
      icon={icon}
      glowing={status === "within"}
      trend={statusTrend[status]}
      className={className}
    />
  );
}
