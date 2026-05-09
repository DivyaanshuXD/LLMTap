import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ExternalLink, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedGridPattern } from "./components/magicui/animated-grid-pattern.tsx";
import { BootSequence } from "./components/BootSequence.tsx";
import { BrandMark } from "./components/BrandMark.tsx";
import { CommandPalette } from "./components/CommandPalette.tsx";
import { ConnectionToast } from "./components/ConnectionToast.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { LivePulse } from "./components/LivePulse.tsx";
import { QuickConnectWidget } from "./components/QuickConnectWidget.tsx";
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
const PROJECT_SITE_URL = "https://llmtap.vercel.app";

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
        <BootSequence />
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
              <div className="dashboard-shell mx-auto grid max-w-[1760px] items-center gap-3 rounded-[32px] px-4 py-3 sm:px-5 lg:grid-cols-[auto_minmax(260px,29rem)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="h-[56px] w-[56px] rounded-[calc(var(--radius-panel)+5px)] border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(var(--ch-accent),0.12),rgba(var(--ch-bg-surface),0.9)_42%,rgba(var(--ch-bg-base),0.98))] text-[var(--color-accent-max)] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.06),0_0_28px_rgba(var(--ch-accent),0.10),0_18px_38px_rgba(var(--ch-bg-base),0.22)] hover:border-[var(--border-bright)] hover:bg-[linear-gradient(180deg,rgba(var(--ch-accent),0.18),rgba(var(--ch-bg-surface),0.94)_44%,rgba(var(--ch-bg-base),0.98))] hover:text-[var(--color-accent-max)] hover:shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.08),0_0_38px_rgba(var(--ch-accent),0.16),0_20px_44px_rgba(var(--ch-bg-base),0.26)] [&_svg]:!h-[18px] [&_svg]:!w-[18px]" />
                  <div className="flex min-w-0 items-center gap-3 rounded-[calc(var(--radius-panel)+6px)] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.88),rgba(var(--ch-bg-panel),0.96))] px-4 py-3 shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.04),0_20px_48px_rgba(0,0,0,0.24)]">
                    <BrandMark size="md" />
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
                <div className="min-w-0 justify-self-center lg:w-full lg:px-2">
                  <CommandPalette />
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <a
                    className="hidden h-11 items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[linear-gradient(135deg,rgba(var(--ch-accent),0.18),rgba(var(--ch-bg-surface),0.84)_48%,rgba(var(--ch-bg-base),0.94))] px-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent-max)] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.06),0_0_26px_rgba(var(--ch-accent),0.12)] transition-all duration-200 ease-out hover:border-[var(--border-bright)] hover:bg-[linear-gradient(135deg,rgba(var(--ch-accent),0.24),rgba(var(--ch-bg-lift),0.86)_52%,rgba(var(--ch-bg-base),0.94))] hover:text-[var(--color-accent-max)] hover:shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.08),0_0_42px_rgba(var(--ch-accent),0.22)] xl:inline-flex"
                    href={PROJECT_SITE_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Project Site</span>
                  </a>
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

          <QuickConnectWidget />
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}

export default App;
