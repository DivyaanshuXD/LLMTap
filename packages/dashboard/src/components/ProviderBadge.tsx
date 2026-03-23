import { cn } from "@/lib/utils.ts";
import {
  providerBadgeStyles,
  defaultBadgeStyle,
} from "@/lib/provider-colors.ts";

export function ProviderBadge({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  const key = provider.toLowerCase();
  const style = providerBadgeStyles[key] ?? defaultBadgeStyle;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      {provider}
    </span>
  );
}
