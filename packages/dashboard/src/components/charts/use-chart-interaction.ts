"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ChartSelection,
  LineConfig,
  LinearScaleLike,
  Margin,
  TimeScaleLike,
  TooltipPoint,
} from "./chart-context.tsx";

interface UseChartInteractionOptions {
  xScale: TimeScaleLike;
  yScale: LinearScaleLike;
  data: Record<string, unknown>[];
  lines: LineConfig[];
  margin: Margin;
  xAccessor: (d: Record<string, unknown>) => Date;
  bisectDate: {
    (array: Record<string, unknown>[], x: Date, lo?: number, hi?: number): number;
  };
  canInteract: boolean;
}

export function useChartInteraction({
  xScale,
  yScale,
  data,
  lines,
  xAccessor,
  bisectDate,
  canInteract,
}: UseChartInteractionOptions) {
  const [tooltipData, setTooltipData] = useState<TooltipPoint | null>(null);
  const [selection, setSelection] = useState<ChartSelection | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const getRelativeX = useCallback(
    (event: React.PointerEvent<SVGGElement> | React.MouseEvent<SVGGElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const localX = event.clientX - bounds.left;
      return Math.max(0, Math.min(localX, bounds.width));
    },
    []
  );

  const resolveNearestPoint = useCallback(
    (localX: number): TooltipPoint | null => {
      if (!data.length) return null;

      const hoveredDate = xScale.invert(localX);
      const insertion = bisectDate(data, hoveredDate, 1);
      const previous = data[insertion - 1];
      const next = data[insertion];
      const target =
        next && previous
          ? hoveredDate.getTime() - xAccessor(previous).getTime() >
            xAccessor(next).getTime() - hoveredDate.getTime()
            ? next
            : previous
          : previous ?? next;

      if (!target) return null;

      const index = data.indexOf(target);
      const x = xScale(xAccessor(target)) ?? 0;
      const activeLine = lines[0];
      const rawY = activeLine ? target[activeLine.dataKey] : null;
      const y = typeof rawY === "number" ? (yScale(rawY) ?? 0) : 0;

      return { index, datum: target, x, y };
    },
    [bisectDate, data, lines, xAccessor, xScale, yScale]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGGElement>) => {
      if (!canInteract) return;
      const localX = getRelativeX(event);
      setTooltipData(resolveNearestPoint(localX));

      setSelection((current) =>
        current?.active
          ? {
              ...current,
              endX: localX,
            }
          : current
      );
    },
    [canInteract, getRelativeX, resolveNearestPoint]
  );

  const handlePointerLeave = useCallback(() => {
    if (!selection?.active) {
      setTooltipData(null);
    }
  }, [selection?.active]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGGElement>) => {
      if (!canInteract) return;
      const localX = getRelativeX(event);
      setSelection({
        active: true,
        startX: localX,
        endX: localX,
      });
    },
    [canInteract, getRelativeX]
  );

  const handlePointerUp = useCallback(() => {
    setSelection((current) =>
      current
        ? {
            ...current,
            active: false,
          }
        : current
    );
  }, []);

  const interactionHandlers = useMemo(
    () => ({
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
    }),
    [handlePointerDown, handlePointerLeave, handlePointerMove, handlePointerUp]
  );

  const interactionStyle = useMemo(
    () => ({
      cursor: canInteract ? "crosshair" : "default",
    }),
    [canInteract]
  );

  return {
    tooltipData,
    setTooltipData,
    selection,
    clearSelection,
    interactionHandlers,
    interactionStyle,
  };
}
