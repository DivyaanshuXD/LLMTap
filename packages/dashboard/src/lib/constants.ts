export const PERIOD_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 6, label: "6h" },
  { value: 24, label: "24h" },
  { value: 168, label: "7d" },
  { value: 720, label: "30d" },
] as const;

// Row animation variants for table rows (staggered entrance)
export const tableRowVariants = {
  initial: { opacity: 0, x: -8 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.03 * i, duration: 0.3 },
  }),
};

// Stagger container for cards / lists
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
