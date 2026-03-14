import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface KeyboardShortcutsOptions {
  onToggleHelp: () => void;
}

/**
 * Global keyboard shortcuts hook.
 *
 * - `/` or `Ctrl+K`: Focus search input (if on a page with search)
 * - `g o`: Go to Overview
 * - `g t`: Go to Traces
 * - `g c`: Go to Costs (Economics)
 * - `g m`: Go to Models
 * - `g s`: Go to Sessions
 * - `g x`: Go to Settings
 * - `?`: Show shortcuts help
 * - `Esc`: Close modals/panels
 */
export function useKeyboardShortcuts({ onToggleHelp }: KeyboardShortcutsOptions): void {
  const navigate = useNavigate();
  const pendingGRef = useRef(false);
  const pendingGTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Don't intercept when typing in inputs (except Escape)
      if (isInput && e.key !== "Escape") return;

      // Ctrl+K or / -> focus search
      if (e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="earch"], input[type="search"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // ? -> show help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // Escape -> blur active element / close modals
      if (e.key === "Escape") {
        if (isInput) {
          (target as HTMLElement).blur();
        }
        pendingGRef.current = false;
        if (pendingGTimerRef.current) {
          clearTimeout(pendingGTimerRef.current);
          pendingGTimerRef.current = null;
        }
        return;
      }

      // g prefix navigation
      if (e.key === "g" && !e.ctrlKey && !e.metaKey && !pendingGRef.current) {
        pendingGRef.current = true;
        // Auto-cancel after 1.5s
        if (pendingGTimerRef.current) clearTimeout(pendingGTimerRef.current);
        pendingGTimerRef.current = setTimeout(() => {
          pendingGRef.current = false;
          pendingGTimerRef.current = null;
        }, 1500);
        return;
      }

      if (pendingGRef.current) {
        pendingGRef.current = false;
        if (pendingGTimerRef.current) {
          clearTimeout(pendingGTimerRef.current);
          pendingGTimerRef.current = null;
        }
        switch (e.key) {
          case "o":
            navigate("/");
            break;
          case "t":
            navigate("/traces");
            break;
          case "c":
            navigate("/costs");
            break;
          case "m":
            navigate("/models");
            break;
          case "s":
            navigate("/sessions");
            break;
          case "x":
            navigate("/settings");
            break;
        }
        return;
      }
    },
    [navigate, onToggleHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingGTimerRef.current) {
        clearTimeout(pendingGTimerRef.current);
      }
    };
  }, [handleKeyDown]);
}
