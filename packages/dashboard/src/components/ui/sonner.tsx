import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[rgba(var(--ch-bg-panel),0.95)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-[var(--color-text-primary)] group-[.toaster]:border-[var(--border-default)] group-[.toaster]:shadow-[0_16px_40px_rgba(0,0,0,0.4)] group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-[var(--color-text-secondary)]",
          actionButton:
            "group-[.toast]:bg-[var(--color-accent)] group-[.toast]:text-[var(--color-bg-base)]",
          cancelButton:
            "group-[.toast]:bg-[rgba(var(--ch-bg-surface),0.72)] group-[.toast]:text-[var(--color-text-secondary)]",
          success:
            "group-[.toaster]:border-[var(--color-accent-2)]/25 group-[.toaster]:text-[var(--color-accent)]",
          error:
            "group-[.toaster]:border-[var(--color-error)]/28 group-[.toaster]:text-[var(--color-error)]",
          warning:
            "group-[.toaster]:border-[var(--color-warning)]/25 group-[.toaster]:text-[var(--color-warning)]",
          info: "group-[.toaster]:border-[var(--color-accent)]/20 group-[.toaster]:text-[var(--color-accent)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
