"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.tsx";

export interface GlowingLineChartProps {
  data: Array<Record<string, string | number>>;
  xDataKey: string;
  primaryDataKey: string;
  secondaryDataKey?: string;
}

export function GlowingLineChart({
  data,
  xDataKey,
  primaryDataKey,
  secondaryDataKey,
}: GlowingLineChartProps) {
  const chartConfig = {
    [primaryDataKey]: {
      label: "Primary",
      color: "#34d399",
    },
    ...(secondaryDataKey
      ? {
          [secondaryDataKey]: {
            label: "Secondary",
            color: "#38bdf8",
          },
        }
      : {}),
  } satisfies ChartConfig;

  return (
    <>
      <div className="mb-2 flex items-center justify-end">
        <Badge
          variant="default"
          className="border-none bg-emerald-500/10 text-emerald-400"
        >
          <TrendingUp className="h-4 w-4" />
          <span>live</span>
        </Badge>
      </div>

      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <LineChart
          accessibilityLayer
          data={data}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={xDataKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) => {
              if (typeof value === "number") {
                return new Date(value).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }
              return String(value);
            }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => {
                  if (typeof value === "number") {
                    return new Date(value).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  }
                  return String(value);
                }}
              />
            }
          />
          <Line
            dataKey={primaryDataKey}
            type="bump"
            stroke="#34d399"
            dot={false}
            strokeWidth={2}
            filter="url(#rainbow-line-glow)"
          />
          {secondaryDataKey && (
            <Line
              dataKey={secondaryDataKey}
              type="bump"
              stroke="#38bdf8"
              dot={false}
              strokeWidth={2}
              filter="url(#rainbow-line-glow)"
            />
          )}
          <defs>
            <filter id="rainbow-line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </LineChart>
      </ChartContainer>
    </>
  );
}

export default GlowingLineChart;
