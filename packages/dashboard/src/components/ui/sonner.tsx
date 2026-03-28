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
            "group-[.toast]:bg-[#66FCF1] group-[.toast]:text-slate-950",
          cancelButton:
            "group-[.toast]:bg-white/6 group-[.toast]:text-slate-400",
          success:
            "group-[.toaster]:border-[#45A29E]/25 group-[.toaster]:text-[#66FCF1]",
          error:
            "group-[.toaster]:border-[#C5C6C7]/20 group-[.toaster]:text-[#C5C6C7]",
          warning:
            "group-[.toaster]:border-[#45A29E]/25 group-[.toaster]:text-[#45A29E]",
          info: "group-[.toaster]:border-[#66FCF1]/20 group-[.toaster]:text-[#66FCF1]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
