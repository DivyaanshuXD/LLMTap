"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

export interface TimeScaleLike {
  (value: Date): number | undefined;
  invert(value: number): Date;
}

export interface LinearScaleLike {
  (value: number): number | undefined;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LineConfig {
  dataKey: string;
  stroke: string;
  strokeWidth: number;
}

export interface TooltipPoint {
  index: number;
  datum: Record<string, unknown>;
  x: number;
  y: number;
}

export interface ChartSelection {
  active: boolean;
  startX: number;
  endX: number;
}

interface ChartContextValue {
  data: Record<string, unknown>[];
  xScale: TimeScaleLike;
  yScale: LinearScaleLike;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
  columnWidth: number;
  tooltipData: TooltipPoint | null;
  setTooltipData: Dispatch<SetStateAction<TooltipPoint | null>>;
  containerRef: RefObject<HTMLDivElement | null>;
  lines: LineConfig[];
  isLoaded: boolean;
  animationDuration: number;
  xAccessor: (d: Record<string, unknown>) => Date;
  dateLabels: string[];
  selection: ChartSelection | null;
  clearSelection: () => void;
}

const ChartContext = createContext<ChartContextValue | null>(null);

export const chartCssVars = {
  linePrimary: "#66FCF1",
  lineSecondary: "#45A29E",
} as const;

export function ChartProvider({
  value,
  children,
}: {
  value: ChartContextValue;
  children: ReactNode;
}) {
  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
}

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used inside a LineChart.");
  }
  return context;
}
