import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Command, Sparkles, TowerControl } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedGridPattern } from "./components/magicui/animated-grid-pattern.tsx";
import { CommandPalette } from "./components/CommandPalette.tsx";
import { ConnectionToast } from "./components/ConnectionToast.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { LivePulse } from "./components/LivePulse.tsx";
import { ShortcutsHelp } from "./components/ShortcutsHelp.tsx";
import { AppSidebar } from "./components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.ts";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const TracesExplorer = lazy(() => import("./pages/Traces.tsx"));
const TraceDetail = lazy(() => import("./pages/TraceDetail.tsx"));
const Costs = lazy(() => import("./pages/Costs.tsx"));
const Models = lazy(() => import("./pages/Models.tsx"));
const Sessions = lazy(() => import("./pages/Sessions.tsx"));
const SettingsPage = lazy(() => import("./pages/Settings.tsx"));

function RouteSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-6">
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
  const routeLabel =
    location.pathname === "/"
      ? "Overview"
      : location.pathname.startsWith("/trace/")
        ? "Trace Detail"
        : location.pathname.startsWith("/traces")
          ? "Traces"
          : location.pathname.startsWith("/costs")
            ? "Economics"
            : location.pathname.startsWith("/models")
              ? "Models"
              : location.pathname.startsWith("/sessions")
                ? "Sessions"
                : location.pathname.startsWith("/settings")
                  ? "Settings"
                  : "Surface";

  const toggleShortcuts = useCallback(() => setShortcutsOpen((value) => !value), []);
  const openCommand = useCallback(() => {
    window.dispatchEvent(new Event("llmtap:open-command-palette"));
  }, []);

  useKeyboardShortcuts({
    onToggleHelp: toggleShortcuts,
    onOpenCommandPalette: openCommand,
  });

  useEffect(() => {
    const onToggleShortcuts = () => toggleShortcuts();
    window.addEventListener("llmtap:toggle-shortcuts", onToggleShortcuts);
    return () => {
      window.removeEventListener("llmtap:toggle-shortcuts", onToggleShortcuts);
    };
  }, [toggleShortcuts]);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-obsidian text-[var(--color-text-primary)]">
        <ConnectionToast />
        <Toaster />
        <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <AnimatedGridPattern />
          <div
            className="absolute left-[-12rem] top-16 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ background: "var(--bloom-soft)" }}
          />
          <div
            className="absolute right-[-8rem] top-0 h-[24rem] w-[24rem] rounded-full blur-3xl"
            style={{ background: "var(--bloom-purple)" }}
          />
          <div
            className="absolute bottom-[-10rem] left-1/2 h-[24rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: "var(--bloom-soft)" }}
          />
        </div>
        <SidebarProvider>
          <AppSidebar />

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-3 z-30 px-4 pt-3 sm:px-6 lg:px-8">
              <div className="dashboard-shell mx-auto grid max-w-[1760px] items-center gap-3 rounded-[32px] px-4 py-3 sm:px-5 lg:grid-cols-[auto_minmax(440px,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="h-11 w-11 rounded-[var(--radius-panel)]" />
                  <div className="flex min-w-0 items-center gap-3 rounded-[calc(var(--radius-panel)+6px)] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.88),rgba(var(--ch-bg-panel),0.96))] px-4 py-3 shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.04),0_20px_48px_rgba(0,0,0,0.24)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-[var(--border-default)] bg-[linear-gradient(145deg,var(--color-accent-max),var(--color-accent-2))] text-[var(--color-bg-base)] shadow-[0_14px_28px_rgba(var(--ch-accent),0.22)]">
                      <TowerControl className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="hud-label text-[var(--color-text-secondary)]">Operator Surface</div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2.5">
                        <h2
                          className="truncate text-[var(--color-text-primary)]"
                          style={{
                            fontFamily: "var(--font-operator)",
                            fontSize: "22px",
                            fontWeight: 700,
                            lineHeight: "1",
                            letterSpacing: "-0.045em",
                          }}
                        >
                          LLMTap Runtime Intelligence
                        </h2>
                        <span className="badge badge-active hidden sm:inline-flex">
                          v0.1.0
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 lg:px-2">
                  <CommandPalette />
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <div className="status-chip hidden 2xl:flex">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
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
              <div className="dashboard-shell mx-auto flex max-w-[1760px] flex-col gap-3 rounded-[24px] px-5 py-4 text-xs text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span>Open-source LLM observability, built for local-first workflows.</span>
                </div>
                <span className="font-mono tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  HTTP://LOCALHOST:4781
                </span>
              </div>
            </footer>
          </div>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}

export default App;
