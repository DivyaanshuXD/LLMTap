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
import { NumberTicker } from "../components/magicui/number-ticker.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatTimeAgo,
} from "../lib/format.ts";

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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-sky-300 transition-colors group-hover:border-emerald-400/20 group-hover:text-emerald-300">
              <MessageSquareMore className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-xs font-semibold text-slate-100 transition-colors group-hover:text-emerald-300">
                {row.original.sessionId.length > 28
                  ? `${row.original.sessionId.slice(0, 26)}...`
                  : row.original.sessionId}
              </span>
              <span className="mt-1 block text-[11px] text-slate-500">
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
          <span className="font-mono text-xs text-slate-300">{row.original.traceCount}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "spanCount",
        header: "Spans",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-300">{row.original.spanCount}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalTokens",
        header: "Tokens",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-300">
            {formatCompactNumber(row.original.totalTokens)}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalCost",
        header: "Cost",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-white">
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
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
              <AlertTriangle className="h-3 w-3" />
              {row.original.errorCount}
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-500">0</span>
          ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "firstSeen",
        header: "First Seen",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">{formatTimeAgo(row.original.firstSeen)}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "lastSeen",
        header: "Last Active",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">{formatTimeAgo(row.original.lastSeen)}</span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-8">
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
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Active sessions</div>
              <div className="mt-2 text-lg font-medium text-white">
                <NumberTicker value={totalSessions} />
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {totalTraces} traces across all sessions
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Session spend</div>
              <div className="mt-2 text-base font-medium text-white">
                {formatCost(totalCost)}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Combined cost across visible sessions
              </div>
            </div>
          </div>
        </div>
      }
    >
      {sessions.length > 0 ? (
        <motion.div
          className="dashboard-shell overflow-hidden rounded-[26px] px-4 py-4 sm:px-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="hud-label">Session registry</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                Tracked sessions
              </h2>
            </div>
            <span className="status-chip">
              <Users className="h-3.5 w-3.5 text-sky-300" />
              <span>{totalSessions} sessions</span>
            </span>
          </div>
          <DataTable columns={sessionColumns} data={sessions} sorting={sorting} onSortingChange={setSorting} />
        </motion.div>
      ) : (
        <div className="dashboard-shell rounded-[26px] p-16">
          <div className="empty-state">
            <MessageSquareMore className="h-8 w-8 text-slate-500" />
            <div className="text-base font-medium text-white">No sessions tracked yet</div>
            <div className="max-w-md text-center text-sm text-slate-400">
              Sessions appear when you pass a <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-emerald-300">sessionId</code> to
              the SDK. This groups related traces into logical conversations or workflows.
            </div>
            <pre className="mt-4 max-w-lg rounded-2xl border border-white/8 bg-white/4 p-4 text-left font-mono text-xs text-slate-300">
{`import { init } from "@llmtap/sdk";

init({ sessionId: "user-session-123" });`}
            </pre>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
