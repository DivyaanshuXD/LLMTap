import { lazy, Suspense, useState, useCallback } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Command,
  Cpu,
  DollarSign,
  List,
  MessageSquareMore,
  Radar,
  Settings,
  Sparkles,
  TowerControl,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LivePulse } from "./components/LivePulse.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ConnectionToast } from "./components/ConnectionToast.tsx";
import { ShortcutsHelp } from "./components/ShortcutsHelp.tsx";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.ts";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const TracesExplorer = lazy(() => import("./pages/Traces.tsx"));
const TraceDetail = lazy(() => import("./pages/TraceDetail.tsx"));
const Costs = lazy(() => import("./pages/Costs.tsx"));
const Models = lazy(() => import("./pages/Models.tsx"));
const Sessions = lazy(() => import("./pages/Sessions.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: typeof Activity;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
          isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="nav-panel"
              className="absolute inset-0 rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(14,165,233,0.08))] shadow-[0_20px_80px_rgba(16,185,129,0.15)]"
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
          <span
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
              isActive
                ? "border-white/10 bg-white/8"
                : "border-white/5 bg-white/4 group-hover:border-white/10 group-hover:bg-white/6"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="relative z-10">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function RouteSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <div className="skeleton-panel h-44 rounded-[28px]" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="skeleton-panel h-72 rounded-[24px] lg:col-span-2" />
        <div className="skeleton-panel h-72 rounded-[24px]" />
      </div>
      <div className="skeleton-panel h-80 rounded-[24px]" />
    </div>
  );
}

function App() {
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const toggleShortcuts = useCallback(() => setShortcutsOpen((v) => !v), []);
  useKeyboardShortcuts({ onToggleHelp: toggleShortcuts });

  return (
    <div className="min-h-screen bg-obsidian text-white">
      <ConnectionToast />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,197,94,0.12),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(56,189,248,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.14),transparent_36%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1720px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/6 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="dashboard-shell sticky top-5 rounded-[28px] px-4 py-4 sm:px-5">
            <NavLink
              to="/"
              className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-white/6 bg-white/4 px-4 py-4 transition-colors hover:bg-white/6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#34d399,#38bdf8)] text-slate-950 shadow-[0_20px_50px_rgba(52,211,153,0.35)]">
                <TowerControl className="h-6 w-6" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-300/80">
                  LLMTap
                </div>
                <div className="text-lg font-semibold tracking-[-0.03em] text-white">
                  Mission Control
                </div>
              </div>
            </NavLink>

            <div className="mt-5 rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(4,8,18,0.96))] p-4">
              <div className="hud-label">Control Deck</div>
              <div className="mt-3 space-y-2">
                <nav className="flex flex-col gap-2">
                  <NavItem to="/" icon={Radar} label="Overview" end />
                  <NavItem to="/traces" icon={List} label="Traces" />
                  <NavItem to="/costs" icon={DollarSign} label="Economics" />
                  <NavItem to="/models" icon={Cpu} label="Models" />
                  <NavItem to="/sessions" icon={MessageSquareMore} label="Sessions" />
                  <NavItem to="/settings" icon={Settings} label="Settings" />
                </nav>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-emerald-400/12 bg-[linear-gradient(180deg,rgba(5,18,16,0.92),rgba(4,8,18,0.98))] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Command className="h-4 w-4 text-emerald-300" />
                Local collector
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Real-time traces, token economics, and span internals in one operator surface.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
                  <div className="hud-label">Mode</div>
                  <div className="mt-1 font-mono text-[13px]">LOCAL</div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
                  <div className="hud-label">Port</div>
                  <div className="mt-1 font-mono text-[13px]">4781</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-white/6 px-4 py-4 sm:px-6 lg:px-8">
            <div className="dashboard-shell flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
              <div>
                <div className="hud-label">Operator Surface</div>
                <div className="mt-1 flex items-center gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
                    LLM runtime intelligence
                  </h2>
                  <span className="hidden rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-[11px] font-mono text-slate-400 sm:inline-flex">
                    v0.1.0
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="status-chip hidden sm:flex">
                  <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                  <span>Streaming observability</span>
                </div>
                <LivePulse />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Suspense fallback={<RouteSkeleton />}>
                    <Routes location={location}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/traces" element={<TracesExplorer />} />
                      <Route path="/trace/:traceId" element={<TraceDetail />} />
                      <Route path="/costs" element={<Costs />} />
                      <Route path="/models" element={<Models />} />
                      <Route path="/sessions" element={<Sessions />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </main>

          <footer className="px-4 pb-5 sm:px-6 lg:px-8">
            <div className="dashboard-shell flex flex-col gap-3 rounded-[24px] px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                <span>Open-source LLM observability, built for local-first workflows.</span>
              </div>
              <span className="font-mono tracking-[0.18em] text-slate-500">
                HTTP://LOCALHOST:4781
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
