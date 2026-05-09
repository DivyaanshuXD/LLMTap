"use client";

import { TowerControl } from "lucide-react";
import defaultLogo from "@/assets/llmtap-logo.png";
import { cn } from "@/lib/utils.ts";

type BrandMarkSize = "sm" | "md" | "lg" | "xl";

interface BrandMarkProps {
  alt?: string;
  className?: string;
  iconClassName?: string;
  size?: BrandMarkSize;
  src?: string;
}

const markSize: Record<BrandMarkSize, string> = {
  sm: "h-9 w-9 rounded-2xl",
  md: "h-10 w-10 rounded-[18px]",
  lg: "h-11 w-11 rounded-[20px]",
  xl: "h-12 w-12 rounded-[22px]",
};

const iconSize: Record<BrandMarkSize, string> = {
  sm: "h-4 w-4",
  md: "h-4.5 w-4.5",
  lg: "h-5 w-5",
  xl: "h-5.5 w-5.5",
};

/** Shared LLMTap brand mark used across dashboard chrome. */
export function BrandMark({
  alt = "LLMTap",
  className,
  iconClassName,
  size = "md",
  src = defaultLogo,
}: BrandMarkProps) {
  return (
    <span
      aria-label={src ? alt : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-default)] bg-[var(--color-ink)] text-[var(--color-accent-max)] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.06),0_0_24px_rgba(var(--ch-accent),0.12)]",
        markSize[size],
        className
      )}
      role={src ? "img" : undefined}
    >
      {src ? (
        <img
          alt={alt}
          className="h-full w-full scale-[1.78] object-contain object-center"
          draggable={false}
          src={src}
        />
      ) : (
        <TowerControl className={cn(iconSize[size], iconClassName)} />
      )}
    </span>
  );
}
