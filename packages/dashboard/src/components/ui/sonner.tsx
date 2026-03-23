import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-slate-200 group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_16px_40px_rgba(0,0,0,0.4)] group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-emerald-500 group-[.toast]:text-slate-950",
          cancelButton:
            "group-[.toast]:bg-white/6 group-[.toast]:text-slate-400",
          success:
            "group-[.toaster]:border-emerald-400/20 group-[.toaster]:text-emerald-200",
          error:
            "group-[.toaster]:border-rose-400/20 group-[.toaster]:text-rose-200",
          warning:
            "group-[.toaster]:border-amber-400/20 group-[.toaster]:text-amber-200",
          info: "group-[.toaster]:border-sky-400/20 group-[.toaster]:text-sky-200",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
