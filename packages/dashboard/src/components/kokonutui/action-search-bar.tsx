"use client";

/**
 * @author: @kokonutui
 * @description: A modern search bar component with action buttons and suggestions
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Search, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  short?: string;
  end?: string;
}

interface SearchResult {
  actions: Action[];
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: { duration: 0.26 },
        staggerChildren: 0.06,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: { duration: 0.22 },
        opacity: { duration: 0.16 },
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22 },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: 0.14 },
    },
  },
} as const;

function ActionSearchBar({
  actions,
  defaultOpen = false,
  placeholder = "What's up?",
  onAction,
  openEventName = "llmtap:open-command-palette",
  className,
}: {
  actions: Action[];
  defaultOpen?: boolean;
  placeholder?: string;
  onAction?: (action: Action) => void;
  openEventName?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isFocused, setIsFocused] = useState(defaultOpen);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [panelRect, setPanelRect] = useState<{ left: number; top: number; width: number } | null>(
    null
  );

  const filteredActions = useMemo(() => {
    if (!query) return actions;

    const normalizedQuery = query.toLowerCase().trim();
    return actions.filter((action) => {
      const searchableText =
        `${action.label} ${action.description || ""} ${action.end || ""}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [query, actions]);

  useEffect(() => {
    if (!isFocused) {
      setResult(null);
      setActiveIndex(-1);
      return;
    }

    setResult({ actions: filteredActions });
    setActiveIndex(filteredActions.length > 0 ? 0 : -1);
  }, [filteredActions, isFocused]);

  useEffect(() => {
    const openFromApp = () => {
      setSelectedAction(null);
      setIsFocused(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    window.addEventListener(openEventName, openFromApp);
    return () => window.removeEventListener(openEventName, openFromApp);
  }, [openEventName]);

  const syncPanelPosition = useCallback(() => {
    const anchor = rootRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPanelRect({
      left: rect.left,
      top: rect.bottom + 10,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!isFocused || selectedAction) {
      setPanelRect(null);
      return;
    }

    syncPanelPosition();
    const update = () => syncPanelPosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isFocused, selectedAction, syncPanelPosition]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setSelectedAction(null);
      setActiveIndex(-1);
    },
    []
  );

  const commitAction = useCallback(
    (action: Action) => {
      setSelectedAction(action);
      setQuery("");
      setIsFocused(false);
      setActiveIndex(-1);
      onAction?.(action);
    },
    [onAction]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!result?.actions.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < result.actions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : result.actions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && result.actions[activeIndex]) {
            commitAction(result.actions[activeIndex]);
          } else if (result.actions[0]) {
            commitAction(result.actions[0]);
          }
          break;
        case "Escape":
          setIsFocused(false);
          setActiveIndex(-1);
          break;
      }
    },
    [activeIndex, commitAction, result?.actions]
  );

  const handleActionClick = useCallback(
    (action: Action) => {
      commitAction(action);
    },
    [commitAction]
  );

  const handleFocus = useCallback(() => {
    setSelectedAction(null);
    setIsFocused(true);
    setActiveIndex(-1);
  }, []);

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      setIsFocused(false);
      setActiveIndex(-1);
    }, 180);
  }, []);

  return (
    <div className={cn("w-full max-w-[44rem]", className)}>
      <div className="relative flex flex-col items-center justify-start">
        <div ref={rootRef} className="z-10 w-full bg-transparent">
          <div className="relative">
            <Input
              ref={inputRef}
              aria-activedescendant={
                activeIndex >= 0
                  ? `action-${result?.actions[activeIndex]?.id}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-expanded={isFocused && !!result}
              autoComplete="off"
              className="h-12 rounded-[20px] border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.9),rgba(var(--ch-bg-base),0.98))] py-2 pr-11 pl-4 text-[15px] font-medium text-[var(--color-text-primary)] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.05),0_20px_44px_rgba(0,0,0,0.28)] placeholder:text-[var(--color-text-secondary)] focus-visible:border-[var(--border-bright)] focus-visible:ring-[var(--color-accent)]/30"
              id="command-search"
              onBlur={handleBlur}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              role="combobox"
              type="text"
              value={query}
            />
            <div className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2">
              <AnimatePresence mode="popLayout">
                {query.length > 0 ? (
                  <motion.div
                    key="send"
                    initial={{ y: -14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 14, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Send className="h-4 w-4 text-[var(--color-accent)]/72" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="search"
                    initial={{ y: -14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 14, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Search className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isFocused && result && !selectedAction && panelRect ? (
                <motion.div
                  animate="show"
                  aria-label="Search results"
                  className="fixed z-[120] overflow-hidden rounded-[22px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.98),rgba(var(--ch-bg-base),0.995))] shadow-[0_34px_96px_rgba(0,0,0,0.48),0_0_0_1px_rgba(var(--ch-violet),0.06)] backdrop-blur-xl"
                  exit="exit"
                  initial="hidden"
                  role="listbox"
                  style={{
                    left: panelRect.left,
                    top: panelRect.top,
                    width: panelRect.width,
                  }}
                  variants={ANIMATION_VARIANTS.container}
                >
                  <motion.ul role="none" className="p-2">
                    {result.actions.map((action, index) => (
                      <motion.li
                        key={action.id}
                        id={`action-${action.id}`}
                        layout
                        role="option"
                        aria-selected={activeIndex === index}
                        onClick={() => handleActionClick(action)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-[18px] border border-transparent px-3 py-2.5 transition-colors",
                          "hover:border-[var(--color-accent)]/16 hover:bg-[var(--color-accent)]/8",
                          activeIndex === index
                            ? "border-[var(--border-default)] bg-[linear-gradient(135deg,rgba(var(--ch-accent),0.16),rgba(var(--ch-violet),0.08))]"
                            : ""
                        )}
                        variants={ANIMATION_VARIANTS.item}
                      >
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="text-[var(--color-text-tertiary)]">
                            {action.icon}
                          </span>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-sm text-[var(--color-text-primary)]">
                              {action.label}
                            </span>
                            {action.description ? (
                              <span className="truncate text-xs text-[var(--color-text-tertiary)]">
                                {action.description}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          {action.short ? (
                            <span
                              aria-label={`Keyboard shortcut: ${action.short}`}
                              className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
                            >
                              {action.short}
                            </span>
                          ) : null}
                          {action.end ? (
                            <span className="text-right text-[11px] text-[var(--color-text-tertiary)]">
                              {action.end}
                            </span>
                          ) : null}
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                  <div className="border-t border-[var(--border-dim)] px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
                      <span>Press Ctrl+K to open commands</span>
                      <span>ESC to cancel</span>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

export default ActionSearchBar;
