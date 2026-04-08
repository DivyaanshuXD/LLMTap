import { useQuery } from "@tanstack/react-query";
import { fetchSessions } from "../api/client.ts";
import {
  AlertTriangle,
  Clock,
  Coins,
  MessageSquareMore,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "../components/DataTable.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import { EmptyState } from "../components/system/EmptyState.tsx";
import { NumberTicker } from "../components/magicui/number-ticker.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatTimeAgo,
} from "../lib/format.ts";

/* ── Shared surface classes (DRY) ────────────────────────── */
const sectionShell = "dashboard-shell rounded-[var(--radius-card)]";

export default function Sessions() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "lastSeen", desc: true },
  ]);
  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => fetchSessions(168),
  });

  const sessions = data?.sessions ?? [];
  const totalSessions = data?.total ?? 0;
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);
  const totalTraces = sessions.reduce((sum, s) => sum + s.traceCount, 0);
  const sessionColumns = useMemo<ColumnDef<(typeof sessions)[number]>[]>(
    () => [
      {
        accessorKey: "sessionId",
        header: "Session ID",
        cell: ({ row }) => (
          <Link
            to={`/traces?q=${encodeURIComponent(row.original.sessionId)}`}
            className="group inline-flex min-w-0 items-center gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] text-[var(--color-accent)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-accent)]">
              <MessageSquareMore className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]">
                {row.original.sessionId.length > 28
                  ? `${row.original.sessionId.slice(0, 26)}...`
                  : row.original.sessionId}
              </span>
              <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                Last active {formatTimeAgo(row.original.lastSeen)}
              </span>
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "traceCount",
        header: "Traces",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">{row.original.traceCount}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "spanCount",
        header: "Spans",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">{row.original.spanCount}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalTokens",
        header: "Tokens",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">
            {formatCompactNumber(row.original.totalTokens)}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalCost",
        header: "Cost",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
            {formatCost(row.original.totalCost)}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "errorCount",
        header: "Errors",
        cell: ({ row }) =>
          row.original.errorCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-text-primary)]/20 bg-[var(--color-text-primary)]/10 px-2 py-0.5 text-xs font-bold text-[var(--color-text-primary)]">
              <AlertTriangle className="h-3 w-3" />
              {row.original.errorCount}
            </span>
          ) : (
            <span className="font-mono text-sm text-[var(--color-text-tertiary)]">0</span>
          ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "firstSeen",
        header: "First Seen",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-text-secondary)]">{formatTimeAgo(row.original.firstSeen)}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "lastSeen",
        header: "Last Active",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-text-secondary)]">{formatTimeAgo(row.original.lastSeen)}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1760px] space-y-8">
        <div className="skeleton-panel h-44 rounded-[28px]" />
        <div className="skeleton-panel h-80 rounded-[24px]" />
      </div>
    );
  }

  return (
    <PageFrame
      eyebrow="Session Fabric"
      title="Multi-turn conversations, grouped and measured."
      description="Sessions collect related traces into logical units. Track total cost and token volume across entire user conversations, multi-step agent runs, or workflow pipelines."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-5 space-y-4">
            <div className="deck-card deck-card--accent">
              <div className="hud-label">Active sessions</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                <NumberTicker value={totalSessions} />
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {totalTraces} traces across all sessions
              </div>
            </div>
            <div className="deck-card">
              <div className="hud-label">Session spend</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                {formatCost(totalCost)}
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Combined cost across visible sessions
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="pill-strip w-fit max-w-full overflow-x-auto">
        <span className="pill-item">
          window <strong>168h</strong>
        </span>
        <span className="pill-item">
          sessions <strong>{totalSessions}</strong>
        </span>
        <span className="pill-item">
          traces <strong>{totalTraces}</strong>
        </span>
        <span className="pill-item">
          spend <strong>{formatCost(totalCost)}</strong>
        </span>
      </div>

      {sessions.length > 0 ? (
        <motion.div
          className={`${sectionShell} overflow-hidden p-5`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="hud-label">Session registry</div>
              <h2 className="page-section-title mt-1">
                Tracked sessions
              </h2>
            </div>
            <span className="status-chip">
              <Users className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>{totalSessions} sessions</span>
            </span>
          </div>
          <DataTable columns={sessionColumns} data={sessions} sorting={sorting} onSortingChange={setSorting} />
        </motion.div>
      ) : (
        <div className={`${sectionShell} p-16`}>
          <div className="space-y-6">
            <EmptyState
              title="No sessions tracked yet"
              description='Sessions appear when you pass a `sessionId` to the SDK. This groups related traces into logical conversations or workflows.'
            />
            <pre className="mx-auto mt-5 max-w-lg rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] p-5 text-left font-mono text-sm text-[var(--color-text-secondary)]">
{`import { init } from "@llmtap/sdk";

init({ sessionId: "user-session-123" });`}
            </pre>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
