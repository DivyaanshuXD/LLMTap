import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Command, Sparkles } from "lucide-react";
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
      <div className="min-h-screen bg-obsidian text-white">
        <ConnectionToast />
        <Toaster />
        <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <AnimatedGridPattern />
          <div className="absolute left-[-12rem] top-16 h-[28rem] w-[28rem] rounded-full bg-emerald-400/8 blur-3xl" />
          <div className="absolute right-[-8rem] top-0 h-[24rem] w-[24rem] rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-1/2 h-[24rem] w-[36rem] -translate-x-1/2 rounded-full bg-amber-300/5 blur-3xl" />
        </div>
        <SidebarProvider>
          <AppSidebar />

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="border-b border-white/6 px-4 py-4 sm:px-6 lg:px-8">
              <div className="dashboard-shell flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
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
                </div>
                <div className="flex items-center gap-3">
                  <CommandPalette />
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
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}

export default App;
