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
import { PageFrame } from "../components/PageFrame.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatTimeAgo,
} from "../lib/format.ts";

export default function Sessions() {
  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => fetchSessions(168),
  });

  const sessions = data?.sessions ?? [];
  const totalSessions = data?.total ?? 0;
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);
  const totalTraces = sessions.reduce((sum, s) => sum + s.traceCount, 0);

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
                {totalSessions}
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
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2">Session ID</th>
                  <th className="px-4 py-2 text-right">Traces</th>
                  <th className="px-4 py-2 text-right">Spans</th>
                  <th className="px-4 py-2 text-right">Tokens</th>
                  <th className="px-4 py-2 text-right">Cost</th>
                  <th className="px-4 py-2 text-right">Errors</th>
                  <th className="px-4 py-2 text-right">First Seen</th>
                  <th className="px-4 py-2 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <motion.tr
                    key={session.sessionId}
                    className="rounded-2xl border border-white/6 bg-white/4"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * index, duration: 0.3 }}
                  >
                    <td className="rounded-l-2xl px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquareMore className="h-4 w-4 text-sky-300" />
                        <span className="font-mono text-xs font-semibold text-slate-100">
                          {session.sessionId.length > 28
                            ? `${session.sessionId.slice(0, 26)}...`
                            : session.sessionId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                      {session.traceCount}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                      {session.spanCount}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                      {formatCompactNumber(session.totalTokens)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-white">
                      {formatCost(session.totalCost)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {session.errorCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          {session.errorCount}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-500">
                      {formatTimeAgo(session.firstSeen)}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-right text-xs text-slate-500">
                      {formatTimeAgo(session.lastSeen)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
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
