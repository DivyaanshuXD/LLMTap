import { motion } from "framer-motion";
import { CheckSquare2, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { CostTag } from "./CostTag.tsx";
import { cn } from "@/lib/utils.ts";

export interface TraceRowData {
  id: string;
  name: string;
  status: "active" | "complete" | "error" | "warning";
  spans: number;
  tokens: number;
  cost: number;
  duration: number;
  when: string;
}

export interface TraceRowProps {
  trace: TraceRowData;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
  href?: string;
  index?: number;
  className?: string;
}

function formatDurationValue(duration: number) {
  if (duration < 1000) return `${Math.round(duration)}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
}

function formatTokens(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function costTone(value: number) {
  if (value < 0.01) {
    return {
      color: "var(--color-accent)",
      glow: "0 0 12px rgba(var(--ch-accent), 0.16)",
    };
  }
  if (value < 0.1) {
    return {
      color: "var(--color-text-primary)",
      glow: "none",
    };
  }
  if (value <= 1) {
    return {
      color: "var(--color-warning)",
      glow: "0 0 12px rgba(var(--ch-warning), 0.14)",
    };
  }
  return {
    color: "var(--color-error)",
    glow: "0 0 12px rgba(var(--ch-error), 0.16)",
  };
}

function statusMeta(status: TraceRowData["status"]) {
  if (status === "active") {
    return {
      dot: (
        <span
          aria-hidden="true"
          className="live-dot"
          style={{ display: "inline-block" }}
        />
      ),
      label: "active",
    };
  }

  if (status === "warning") {
    return {
      dot: (
        <span
          aria-hidden="true"
          className="inline-block h-[6px] w-[6px] rounded-full"
          style={{
            background: "var(--color-warning)",
            boxShadow: "0 0 6px rgba(var(--ch-warning), 0.55)",
          }}
        />
      ),
      label: "warning",
    };
  }

  if (status === "error") {
    return {
      dot: (
        <span
          aria-hidden="true"
          className="inline-block h-[6px] w-[6px] rounded-full"
          style={{
            background: "var(--color-error)",
            boxShadow: "0 0 6px rgba(var(--ch-error), 0.48)",
          }}
        />
      ),
      label: "error",
    };
  }

  return {
    dot: (
      <span
        aria-hidden="true"
        className="inline-block h-[6px] w-[6px] rounded-full"
        style={{
          background: "var(--color-accent-2)",
          boxShadow: "0 0 6px rgba(var(--ch-accent-2), 0.38)",
        }}
      />
    ),
    label: "complete",
  };
}

/** Dense trace list row with mission-control formatting and selection state. */
export function TraceRow({
  trace,
  selected = false,
  onSelect,
  onClick,
  href,
  index = 0,
  className,
}: TraceRowProps) {
  const status = statusMeta(trace.status);
  const baseClassName =
    "grid w-full grid-cols-[auto_auto_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(72px,0.5fr)_minmax(80px,0.7fr)_minmax(94px,0.6fr)_minmax(86px,0.6fr)_minmax(96px,0.7fr)] items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(var(--ch-text-primary),0.02)]";
  const rowBody = (
    <>
      {onSelect ? (
        <span
          onClick={(event) => {
            event.stopPropagation();
            onSelect(trace.id);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-dim)] bg-transparent text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-accent)]"
        >
          {selected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </span>
      ) : (
        <span className="w-0" />
      )}

      <div className="flex items-center gap-2">
        {status.dot}
        <span className="mono-label text-[var(--color-text-secondary)]">{status.label}</span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">{trace.name}</div>
        <div className="mono-label mt-1 truncate">{trace.when}</div>
      </div>

      <div className="mono-value truncate text-[var(--color-text-secondary)]">
        {trace.id.slice(0, 10)}
      </div>

      <div className="mono-value justify-self-end">{trace.spans}</div>
      <div className="mono-value justify-self-end">{formatTokens(trace.tokens)}</div>
      <div className="justify-self-end">
        <CostTag value={trace.cost} size="sm" />
      </div>
      <div className="mono-value justify-self-end text-[var(--color-text-secondary)]">
        {formatDurationValue(trace.duration)}
      </div>
      <div className="mono-label justify-self-end text-[var(--color-text-secondary)]">
        {trace.when}
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel)] border transition-[background-color,border-color,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:-translate-y-[1px]",
        className
      )}
      style={{
        borderColor: selected ? "var(--border-default)" : "var(--border-dim)",
        background: selected
          ? "var(--color-accent-dim)"
          : "linear-gradient(180deg, rgba(var(--ch-text-primary), 0.02), rgba(var(--ch-text-primary), 0.01))",
      }}
    >
      {selected ? (
        <div
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-[2px] rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
      ) : null}
      {href && !onSelect ? (
        <Link to={href} onClick={() => onClick?.(trace.id)} className={baseClassName}>
          {rowBody}
        </Link>
      ) : (
        <button type="button" onClick={() => onClick?.(trace.id)} className={baseClassName}>
          {rowBody}
        </button>
      )}
    </motion.div>
  );
}
