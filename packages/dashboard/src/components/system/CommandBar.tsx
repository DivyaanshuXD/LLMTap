import { useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

export interface CommandBarProps {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  shortcut?: string;
  className?: string;
}

/** Monospaced command-style input for search and filtering. */
export function CommandBar({
  placeholder = "Search",
  value,
  onChange,
  shortcut = "⌘K",
  className,
}: CommandBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="h-12 rounded-[var(--radius-panel)] border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.88),rgba(var(--ch-bg-base),0.94))] px-4 pr-16 font-[var(--font-mono)] text-[13px] tracking-[0.03em] text-[var(--color-text-primary)] transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] placeholder:text-[var(--color-text-disabled)] focus-visible:border-[var(--border-bright)] focus-visible:ring-0"
        style={{
          boxShadow: focused
            ? "0 0 0 3px var(--color-accent-soft), 0 0 28px rgba(var(--ch-accent), 0.08)"
            : "inset 0 1px 0 rgba(var(--ch-text-primary), 0.03)",
        }}
      />
      <span
        className={cn(
          "badge pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)]",
          focused && "opacity-0"
        )}
      >
        {shortcut}
      </span>
    </div>
  );
}
