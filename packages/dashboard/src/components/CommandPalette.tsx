"use client";

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import {
  CommandPaletteProvider,
  CommandPalette as BaseCommandPalette,
  useCommandPalette,
} from "@/components/command-palette";
import type { CommandPaletteItem } from "@/components/command-palette";

type PaletteItem = {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string[];
};

const commandGroups: Array<{ heading: string; items: PaletteItem[] }> = [
  {
    heading: "Navigation",
    items: [
      {
        id: "overview",
        label: "Go to Overview",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3" />
            <path d="M12 19v3" />
            <path d="M2 12h3" />
            <path d="M19 12h3" />
          </svg>
        ),
        shortcut: ["G", "O"],
      },
      {
        id: "traces",
        label: "Open Traces",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        ),
        shortcut: ["G", "T"],
      },
      {
        id: "costs",
        label: "Open Economics",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
        shortcut: ["G", "C"],
      },
      {
        id: "models",
        label: "Open Models",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="16" x="4" y="4" rx="2" />
            <rect width="6" height="6" x="9" y="9" rx="1" />
            <path d="M15 2v2" />
            <path d="M15 20v2" />
            <path d="M2 15h2" />
            <path d="M20 15h2" />
            <path d="M2 9h2" />
            <path d="M20 9h2" />
            <path d="M9 2v2" />
            <path d="M9 20v2" />
          </svg>
        ),
        shortcut: ["G", "M"],
      },
      {
        id: "sessions",
        label: "Open Sessions",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10h10" />
            <path d="M7 14h7" />
            <path d="M12 3c4.97 0 9 3.58 9 8s-4.03 8-9 8a9.77 9.77 0 0 1-4.89-1.3L3 21l1.49-3.35A7.47 7.47 0 0 1 3 11c0-4.42 4.03-8 9-8Z" />
          </svg>
        ),
        shortcut: ["G", "S"],
      },
      {
        id: "settings",
        label: "Open Settings",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-1.94 1.53l-.24.97a2 2 0 0 1-1.43 1.43l-.97.24A2 2 0 0 0 5 8.11v.44a2 2 0 0 0 1.53 1.94l.97.24a2 2 0 0 1 1.43 1.43l.24.97A2 2 0 0 0 11.11 15h.44a2 2 0 0 0 1.94-1.53l.24-.97a2 2 0 0 1 1.43-1.43l.97-.24A2 2 0 0 0 18 8.55v-.44a2 2 0 0 0-1.53-1.94l-.97-.24a2 2 0 0 1-1.43-1.43l-.24-.97A2 2 0 0 0 12.22 2Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ),
        shortcut: ["G", "X"],
      },
    ],
  },
  {
    heading: "Actions",
    items: [
      {
        id: "shortcuts",
        label: "Keyboard Shortcuts",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
            <path d="M6 8h.01" />
            <path d="M10 8h.01" />
            <path d="M14 8h.01" />
            <path d="M18 8h.01" />
            <path d="M8 12h8" />
            <path d="M7 16h10" />
          </svg>
        ),
        shortcut: ["?"],
      },
      {
        id: "refresh",
        label: "Refresh Data",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        ),
        shortcut: ["⌘", "R"],
      },
      {
        id: "copy-url",
        label: "Copy Current URL",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        ),
        shortcut: ["⌘", "C"],
      },
    ],
  },
];

export function CommandPalette() {
  return (
    <CommandPaletteProvider>
      <PreviewContent />
    </CommandPaletteProvider>
  );
}

function PreviewContent() {
  const navigate = useNavigate();
  const { open } = useCommandPalette();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const openFromApp = () => open();
    window.addEventListener("llmtap:open-command-palette", openFromApp);
    return () => {
      window.removeEventListener("llmtap:open-command-palette", openFromApp);
    };
  }, [open]);

  return (
    <div className="flex items-center">
      <motion.button
        type="button"
        onClick={open}
        aria-label="Open command palette"
        className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/4 px-4 py-2.5 text-sm text-slate-300 shadow-[0_12px_30px_-15px_rgba(15,23,42,0.6)] backdrop-blur-lg transition-shadow duration-300 hover:bg-white/8 hover:shadow-[0_18px_45px_-20px_rgba(15,23,42,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      >
        <Search className="h-4 w-4 text-emerald-300" aria-hidden />
        <span className="font-medium">Search commands</span>
        <kbd className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-xs text-slate-400">
          Ctrl+K
        </kbd>
      </motion.button>
      <BaseCommandPalette
        groups={commandGroups}
        placeholder="Type a command or search..."
        onSelect={(item: CommandPaletteItem) => {
          if (!item.id) return;

          switch (item.id) {
            case "overview":
              navigate("/");
              break;
            case "traces":
              navigate("/traces");
              break;
            case "costs":
              navigate("/costs");
              break;
            case "models":
              navigate("/models");
              break;
            case "sessions":
              navigate("/sessions");
              break;
            case "settings":
              navigate("/settings");
              break;
            case "shortcuts":
              window.dispatchEvent(new Event("llmtap:toggle-shortcuts"));
              break;
            case "refresh":
              window.location.reload();
              break;
            case "copy-url":
              void navigator.clipboard.writeText(window.location.href);
              break;
            default:
              break;
          }
        }}
      />
    </div>
  );
}
