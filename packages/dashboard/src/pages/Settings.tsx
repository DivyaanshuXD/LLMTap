import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDbInfo, resetData, exportTraces, applyRetention, exportOtlpJson, forwardOtlp } from "../api/client.ts";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Copy,
  Database,
  DollarSign,
  Download,
  HardDrive,
  Info,
  Plus,
  RotateCcw,
  SearchCheck,
  Send,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { GettingStartedPanel } from "../components/GettingStartedPanel.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog.tsx";
import { formatTimeAgo } from "../lib/format.ts";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium text-white ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Pricing overrides state
  const [pricingOverrides, setPricingOverrides] = useState<
    { provider: string; model: string; inputCostPer1M: string; outputCostPer1M: string }[]
  >([]);
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [newPricing, setNewPricing] = useState({ provider: "", model: "", inputCostPer1M: "", outputCostPer1M: "" });

  // Retention config state
  const [retentionDays, setRetentionDays] = useState("30");
  const [retentionSaved, setRetentionSaved] = useState(false);
  const [retentionDeleted, setRetentionDeleted] = useState<number | null>(null);
  const [retentionApplying, setRetentionApplying] = useState(false);

  // OTel export state
  const [otlpEndpoint, setOtlpEndpoint] = useState("");
  const [otlpService, setOtlpService] = useState("llmtap");
  const [otlpForwarding, setOtlpForwarding] = useState(false);
  const [otlpResult, setOtlpResult] = useState<string | null>(null);
  const [otlpExporting, setOtlpExporting] = useState(false);

  // Confirm dialog state
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmRetentionOpen, setConfirmRetentionOpen] = useState(false);

  const { data: dbInfo } = useQuery({
    queryKey: ["db-info"],
    queryFn: fetchDbInfo,
  });

  async function handleReset() {
    setResetting(true);
    try {
      await resetData();
      setResetDone(true);
      queryClient.invalidateQueries();
      toast.success("Trace data cleared", {
        description: "The local collector database has been reset.",
      });
      setTimeout(() => setResetDone(false), 3000);
    } catch (err) {
      toast.error("Reset failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setResetting(false);
    }
  }

  async function executeRetention(days: number) {
    setRetentionApplying(true);
    try {
      const result = await applyRetention(days);
      setRetentionDeleted(result.deletedSpans);
      setRetentionSaved(true);
      queryClient.invalidateQueries();
      toast.success("Retention applied", {
        description:
          result.deletedSpans > 0
            ? `Deleted ${result.deletedSpans} old spans.`
            : "No spans needed cleanup for the selected window.",
      });
      setTimeout(() => {
        setRetentionSaved(false);
        setRetentionDeleted(null);
      }, 4000);
    } catch (err) {
      toast.error("Retention failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setRetentionApplying(false);
    }
  }

  async function handleExport(format: "json" | "csv") {
    setExporting(true);
    try {
      const content = await exportTraces(format);
      const blob = new Blob([content], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `llmtap-traces-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${format.toUpperCase()}`, {
        description: "Trace data was downloaded successfully.",
      });
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setExporting(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    toast.success("Copied to clipboard", {
      description: label === "path" ? "Database path copied." : `${label} copied.`,
    });
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
    <PageFrame
      eyebrow="Control Panel"
      title="Configure, export, and manage your local collector."
      description="This is the operational side of LLMTap: local storage, exports, retention, and recovery controls. Nothing here should feel cryptic."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Database</div>
              <div className="mt-2 text-lg font-medium text-white">
                {dbInfo ? formatBytes(dbInfo.sizeBytes) : "..."}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {dbInfo?.spanCount ?? 0} spans stored
              </div>
            </div>
          </div>
        </div>
      }
    >
      <GettingStartedPanel compact />

      <div className="grid gap-5 xl:grid-cols-2">
        <motion.div
          className="dashboard-shell rounded-[26px] px-5 py-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Database className="h-4 w-4 text-sky-300" />
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
              Database status
            </h2>
          </div>
          <div className="space-y-2">
            <InfoRow label="Size on disk" value={dbInfo ? formatBytes(dbInfo.sizeBytes) : "-"} />
            <InfoRow label="Total spans" value={String(dbInfo?.spanCount ?? 0)} mono />
            <InfoRow label="Total traces" value={String(dbInfo?.traceCount ?? 0)} mono />
            <InfoRow label="Journal mode" value={dbInfo?.walMode?.toUpperCase() ?? "-"} mono />
            <InfoRow
              label="Data range"
              value={
                dbInfo?.oldestSpan && dbInfo?.newestSpan
                  ? `${formatTimeAgo(dbInfo.oldestSpan)} to ${formatTimeAgo(dbInfo.newestSpan)}`
                  : "No data"
              }
            />
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
              <span className="text-sm text-slate-400">Storage path</span>
              <div className="flex items-center gap-2">
                <span className="max-w-[220px] truncate font-mono text-xs text-slate-300">
                  {dbInfo?.path ?? "-"}
                </span>
                {dbInfo?.path && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(dbInfo.path, "path")}
                    className="rounded-lg border border-white/8 bg-white/4 p-1.5 text-slate-400 transition-colors hover:text-white"
                  >
                    {copied === "path" ? (
                      <Check className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-5">
          <motion.div
            className="dashboard-shell rounded-[26px] px-5 py-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          >
            <div className="mb-5 flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-300" />
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                Export data
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Download all trace data for offline analysis, backup, or migration.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleExport("json")}
                disabled={exporting}
                className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{exporting ? "Exporting..." : "Export JSON"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{exporting ? "Exporting..." : "Export CSV"}</span>
              </button>
            </div>
          </motion.div>

          <motion.div
            className="dashboard-shell rounded-[26px] px-5 py-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
          >
            <div className="mb-5 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-300" />
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                Reset data
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Permanently delete all stored traces and spans. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={resetting}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/8 px-4 py-2.5 text-sm font-medium text-rose-200 transition-colors hover:border-rose-400/30 hover:bg-rose-400/14 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetDone ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>Data cleared</span>
                </>
              ) : (
                <>
                  <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
                  <span>{resetting ? "Resetting..." : "Reset all data"}</span>
                </>
              )}
            </button>
          </motion.div>

          <motion.div
            className="dashboard-shell rounded-[26px] px-5 py-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <div className="mb-5 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-300" />
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                Pricing overrides
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Override built-in per-model pricing. Use this for custom or private models not in the default table.
            </p>

            {pricingOverrides.length > 0 && (
              <div className="mb-4 space-y-2">
                {pricingOverrides.map((entry, i) => (
                  <div key={`${entry.provider}-${entry.model}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">{entry.provider}</span>
                      <span className="font-mono text-sm text-white">{entry.model}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400">${entry.inputCostPer1M}/M in</span>
                      <span className="font-mono text-xs text-slate-400">${entry.outputCostPer1M}/M out</span>
                      <button
                        type="button"
                        onClick={() => setPricingOverrides((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-lg border border-white/8 bg-white/4 p-1.5 text-slate-500 transition-colors hover:text-rose-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddPricing ? (
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <input
                    value={newPricing.provider}
                    onChange={(e) => setNewPricing((p) => ({ ...p, provider: e.target.value }))}
                    placeholder="Provider"
                    className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:outline-none"
                  />
                  <input
                    value={newPricing.model}
                    onChange={(e) => setNewPricing((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Model name"
                    className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:outline-none"
                  />
                  <input
                    value={newPricing.inputCostPer1M}
                    onChange={(e) => setNewPricing((p) => ({ ...p, inputCostPer1M: e.target.value }))}
                    placeholder="Input $/M"
                    type="number"
                    step="0.01"
                    className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:outline-none"
                  />
                  <input
                    value={newPricing.outputCostPer1M}
                    onChange={(e) => setNewPricing((p) => ({ ...p, outputCostPer1M: e.target.value }))}
                    placeholder="Output $/M"
                    type="number"
                    step="0.01"
                    className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:outline-none"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (newPricing.provider && newPricing.model && newPricing.inputCostPer1M && newPricing.outputCostPer1M) {
                        setPricingOverrides((prev) => [...prev, { ...newPricing }]);
                        toast.success("Pricing override added", {
                          description: `${newPricing.provider}/${newPricing.model} is ready to use.`,
                        });
                        setNewPricing({ provider: "", model: "", inputCostPer1M: "", outputCostPer1M: "" });
                        setShowAddPricing(false);
                      }
                    }}
                    className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddPricing(false); setNewPricing({ provider: "", model: "", inputCostPer1M: "", outputCostPer1M: "" }); }}
                    className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddPricing(true)}
                className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add pricing override</span>
              </button>
            )}

            {pricingOverrides.length > 0 && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  SDK code to apply these overrides
                </div>
                <pre className="font-mono text-xs leading-relaxed text-slate-300">
{`import { setPricing } from "@llmtap/sdk";
${pricingOverrides.map((e) => `setPricing("${e.provider}", "${e.model}", ${e.inputCostPer1M}, ${e.outputCostPer1M});`).join("\n")}`}
                </pre>
              </div>
            )}
          </motion.div>

          <motion.div
            className="dashboard-shell rounded-[26px] px-5 py-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
          >
            <div className="mb-5 flex items-center gap-2">
              <Timer className="h-4 w-4 text-purple-300" />
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                Data retention
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Configure how long trace data is kept. Older traces will be automatically cleaned up.
            </p>
            <div className="flex items-center gap-3">
              <Select
                value={retentionDays}
                onValueChange={(val) => setRetentionDays(val)}
              >
                <SelectTrigger className="w-[160px] rounded-2xl py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="0">Keep forever</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={async () => {
                  const days = parseInt(retentionDays, 10);
                  if (days > 0) {
                    setConfirmRetentionOpen(true);
                    return;
                  }
                  await executeRetention(days);
                }}
                disabled={retentionApplying}
                className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retentionSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    <span>
                      {retentionDeleted !== null && retentionDeleted > 0
                        ? `Cleaned ${retentionDeleted} spans`
                        : "Applied"}
                    </span>
                  </>
                ) : (
                  <span>{retentionApplying ? "Applying..." : "Apply now"}</span>
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              This immediately deletes spans older than the selected period. For automatic enforcement on every startup, use <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-slate-400">llmtap start --retention {retentionDays}</code>.
            </p>
          </motion.div>

          <motion.div
            className="dashboard-shell rounded-[26px] px-5 py-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27, duration: 0.35 }}
          >
            <div className="mb-5 flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-300" />
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                OpenTelemetry Export
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Export spans in OTLP format for Datadog, Grafana Tempo, Jaeger, Honeycomb, or any OTLP-compatible backend.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                disabled={otlpExporting}
                onClick={async () => {
                  setOtlpExporting(true);
                  try {
                    const content = await exportOtlpJson(1000, otlpService);
                    const blob = new Blob([content], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `llmtap-export.otlp.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success("OTLP export downloaded", {
                      description: "The collector export was saved as OTLP JSON.",
                    });
                  } catch (err) {
                    toast.error("Export failed", { description: err instanceof Error ? err.message : String(err) });
                  } finally {
                    setOtlpExporting(false);
                  }
                }}
                className="flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20"
              >
                <Download className="h-3.5 w-3.5" />
                {otlpExporting ? "Exporting..." : "Download OTLP JSON"}
              </button>

              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Forward to OTLP endpoint
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={otlpEndpoint}
                    onChange={(e) => { setOtlpEndpoint(e.target.value); setOtlpResult(null); }}
                    placeholder="http://localhost:4318/v1/traces"
                    className="flex-1 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={otlpService}
                    onChange={(e) => setOtlpService(e.target.value)}
                    placeholder="service name"
                    className="w-32 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!otlpEndpoint || otlpForwarding}
                    onClick={async () => {
                      setOtlpForwarding(true);
                      setOtlpResult(null);
                      try {
                        const result = await forwardOtlp(otlpEndpoint, { service: otlpService });
                        setOtlpResult(`Forwarded ${result.spanCount} spans`);
                        toast.success("OTLP forward complete", {
                          description: `Forwarded ${result.spanCount} spans to the target endpoint.`,
                        });
                      } catch (err) {
                        setOtlpResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
                        toast.error("OTLP forward failed", {
                          description: err instanceof Error ? err.message : String(err),
                        });
                      } finally {
                        setOtlpForwarding(false);
                      }
                    }}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:opacity-40"
                  >
                    {otlpForwarding ? "Sending..." : "Send"}
                  </button>
                </div>
                {otlpResult && (
                  <p className={`mt-2 text-xs ${otlpResult.startsWith("Error") ? "text-rose-400" : "text-emerald-400"}`}>
                    {otlpResult}
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-500">
                CLI: <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-slate-400">llmtap export --format otlp --endpoint http://localhost:4318/v1/traces</code>
              </p>
            </div>
          </motion.div>

          <motion.div
            className="dashboard-shell rounded-[26px] px-5 py-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            <div className="mb-5 flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-300" />
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                First-run help
              </h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <SearchCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Where the wrap code belongs
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Edit the file in your app where you already create the provider client. That is usually a backend
                  route, agent runner, worker, or script. You do not change code inside this dashboard.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  How to verify the setup
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  After you make one real model call, a new trace should appear on the Overview or Traces page within a
                  few seconds. If nothing appears, run{" "}
                  <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-slate-300">npx llmtap doctor</code>{" "}
                  from the app you are instrumenting.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Useful local operations
                </div>
                <pre className="font-mono text-xs leading-relaxed text-slate-300">
{`npx llmtap doctor
npx llmtap backup
npx llmtap import llmtap-export.json
npx llmtap restore llmtap-backup.db`}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageFrame>

      {/* Reset data confirmation */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all trace data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all stored traces and spans. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReset()}
              className="border-rose-400/20 bg-rose-500 text-white hover:bg-rose-400"
            >
              Delete all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retention confirmation */}
      <AlertDialog open={confirmRetentionOpen} onOpenChange={setConfirmRetentionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply data retention?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all trace data older than {retentionDays} days. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeRetention(parseInt(retentionDays, 10))}
              className="border-rose-400/20 bg-rose-500 text-white hover:bg-rose-400"
            >
              Delete old data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
