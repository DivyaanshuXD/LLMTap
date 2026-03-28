// Canonical provider color mapping — single source of truth
export const providerColors: Record<string, string> = {
  openai: "#66FCF1",
  anthropic: "#45A29E",
  google: "#C5C6C7",
  deepseek: "#66FCF1",
  groq: "#45A29E",
  xai: "#C5C6C7",
};

// Provider badge style config (for ProviderBadge component)
export const providerBadgeStyles: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  openai: {
    bg: "bg-[#66FCF1]/12",
    text: "text-[#66FCF1]",
    border: "border-[#66FCF1]/20",
  },
  anthropic: {
    bg: "bg-[#45A29E]/12",
    text: "text-[#45A29E]",
    border: "border-[#45A29E]/20",
  },
  google: {
    bg: "bg-[#C5C6C7]/12",
    text: "text-[#C5C6C7]",
    border: "border-[#C5C6C7]/20",
  },
  deepseek: {
    bg: "bg-[#66FCF1]/12",
    text: "text-[#66FCF1]",
    border: "border-[#66FCF1]/20",
  },
  groq: {
    bg: "bg-[#45A29E]/12",
    text: "text-[#45A29E]",
    border: "border-[#45A29E]/20",
  },
  xai: {
    bg: "bg-[#C5C6C7]/12",
    text: "text-[#C5C6C7]",
    border: "border-[#C5C6C7]/20",
  },
};

// Fallback style for unknown providers
export const defaultBadgeStyle = {
  bg: "bg-slate-500/12",
  text: "text-slate-400",
  border: "border-slate-500/20",
};
