// Canonical provider color mapping — single source of truth
export const providerColors: Record<string, string> = {
  openai: "#10B981",
  anthropic: "#F59E0B",
  google: "#3B82F6",
  deepseek: "#8B5CF6",
  groq: "#F97316",
  xai: "#EC4899",
};

// Provider badge style config (for ProviderBadge component)
export const providerBadgeStyles: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  openai: {
    bg: "bg-emerald-500/12",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  anthropic: {
    bg: "bg-amber-500/12",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  google: {
    bg: "bg-blue-500/12",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  deepseek: {
    bg: "bg-violet-500/12",
    text: "text-violet-400",
    border: "border-violet-500/20",
  },
  groq: {
    bg: "bg-orange-500/12",
    text: "text-orange-400",
    border: "border-orange-500/20",
  },
  xai: {
    bg: "bg-pink-500/12",
    text: "text-pink-400",
    border: "border-pink-500/20",
  },
};

// Fallback style for unknown providers
export const defaultBadgeStyle = {
  bg: "bg-slate-500/12",
  text: "text-slate-400",
  border: "border-slate-500/20",
};
