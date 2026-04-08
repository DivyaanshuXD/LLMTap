// Canonical provider color mapping — single source of truth
export const providerColors: Record<string, string> = {
  openai: "var(--color-accent)",
  anthropic: "var(--color-accent-2)",
  google: "var(--color-text-primary)",
  deepseek: "var(--color-accent)",
  groq: "var(--color-accent-2)",
  xai: "var(--color-text-primary)",
};

// Provider badge style config (for ProviderBadge component)
export const providerBadgeStyles: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  openai: {
    bg: "bg-[var(--color-accent)]/12",
    text: "text-[var(--color-accent)]",
    border: "border-[var(--color-accent)]/20",
  },
  anthropic: {
    bg: "bg-[var(--color-accent-2)]/12",
    text: "text-[var(--color-accent-2)]",
    border: "border-[var(--color-accent-2)]/20",
  },
  google: {
    bg: "bg-[var(--color-text-primary)]/12",
    text: "text-[var(--color-text-primary)]",
    border: "border-[var(--color-text-primary)]/20",
  },
  deepseek: {
    bg: "bg-[var(--color-accent)]/12",
    text: "text-[var(--color-accent)]",
    border: "border-[var(--color-accent)]/20",
  },
  groq: {
    bg: "bg-[var(--color-accent-2)]/12",
    text: "text-[var(--color-accent-2)]",
    border: "border-[var(--color-accent-2)]/20",
  },
  xai: {
    bg: "bg-[var(--color-text-primary)]/12",
    text: "text-[var(--color-text-primary)]",
    border: "border-[var(--color-text-primary)]/20",
  },
};

// Fallback style for unknown providers
export const defaultBadgeStyle = {
  bg: "bg-transparent",
  text: "text-[var(--color-text-tertiary)]",
  border: "border-[var(--border-invisible)]",
};
