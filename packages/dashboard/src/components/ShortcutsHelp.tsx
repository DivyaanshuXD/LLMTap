import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ["/", "Ctrl+K"], description: "Focus search" },
  { keys: ["G", "O"], description: "Go to Overview" },
  { keys: ["G", "T"], description: "Go to Traces" },
  { keys: ["G", "C"], description: "Go to Economics" },
  { keys: ["G", "M"], description: "Go to Models" },
  { keys: ["G", "S"], description: "Go to Sessions" },
  { keys: ["G", "X"], description: "Go to Settings" },
  { keys: ["?"], description: "Show this help" },
  { keys: ["Esc"], description: "Close panel / blur input" },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.98),rgba(4,8,18,0.99))] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
                  <Keyboard className="h-4.5 w-4.5 text-emerald-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {shortcuts.map((s) => (
                <div
                  key={s.description}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/4"
                >
                  <span className="text-sm text-slate-300">
                    {s.description}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {s.keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex min-w-[28px] items-center justify-center rounded-lg border border-white/12 bg-white/6 px-2 py-1 font-mono text-xs text-slate-300"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-center text-xs text-slate-500">
              Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-slate-400">?</kbd> anytime to toggle this help
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
