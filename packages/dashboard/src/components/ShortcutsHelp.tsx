import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog.tsx";

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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
              <Keyboard className="h-4.5 w-4.5 text-[#66FCF1]" />
            </div>
            <div>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
              <DialogDescription>Navigate faster with keys</DialogDescription>
            </div>
          </div>
        </DialogHeader>

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

        <div className="text-center text-xs text-slate-500">
          Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-slate-400">?</kbd> anytime to toggle this help
        </div>
      </DialogContent>
    </Dialog>
  );
}
