"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type SidebarContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }}
    >
      <div className="relative flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.HTMLAttributes<HTMLElement> & {
  variant?: "sidebar" | "inset";
};

export function Sidebar({ className, children }: SidebarProps) {
  const { open, openMobile, isMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <>
        {openMobile ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenMobile(false)}
          />
        ) : null}
        <aside
          data-slot="sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-73 border-r border-cyan-300/10 bg-[linear-gradient(180deg,rgba(7,13,28,0.98),rgba(2,8,24,0.98))] shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_22px_64px_rgba(0,0,0,0.55)] transition-transform duration-300",
            openMobile ? "translate-x-0" : "-translate-x-full",
            className
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.18),transparent_44%),radial-gradient(circle_at_92%_0%,rgba(56,189,248,0.14),transparent_36%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.06)_1px,transparent_1px)] bg-size-[100%_38px] opacity-30" />
          </div>
          <div data-slot="sidebar-inner" className="relative flex h-full flex-col">{children}</div>
        </aside>
      </>
    );
  }

  return (
    <aside
      data-slot="sidebar"
      data-open={open ? "true" : "false"}
      className={cn(
        "relative z-20 border-r border-cyan-300/10 bg-[linear-gradient(180deg,rgba(7,13,28,0.78),rgba(2,8,24,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_28px_64px_rgba(1,8,20,0.46)] backdrop-blur-xl transition-[width] duration-300",
        open ? "w-73" : "w-23",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(16,185,129,0.2),transparent_44%),radial-gradient(circle_at_92%_0%,rgba(56,189,248,0.16),transparent_36%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.05)_1px,transparent_1px)] bg-size-[100%_38px] opacity-35" />
      </div>
      <div data-slot="sidebar-inner" className="relative flex h-full flex-col overflow-hidden">{children}</div>
    </aside>
  );
}

export function SidebarTrigger({ className }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      onClick={toggleSidebar}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,8,24,0.9))] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(16,185,129,0.15)] transition-all hover:border-emerald-300/35 hover:text-white",
        className
      )}
      aria-label="Toggle sidebar"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sidebar-header" className={cn("px-4", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sidebar-content" className={cn("flex-1", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul data-slot="sidebar-menu" className={cn("space-y-1.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li data-slot="sidebar-menu-item" className={cn(className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sidebar-group" className={cn("py-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn("px-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-200/45", className)}
      {...props}
    />
  );
}

type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
  tooltip?: string;
  render?: React.ReactElement<any>;
  size?: "default" | "lg";
};

export function SidebarMenuButton({
  className,
  isActive,
  tooltip,
  render,
  size,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const classes = cn(
    "group relative flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-300 transition-all",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:opacity-0 before:transition-opacity before:content-[''] before:bg-[linear-gradient(120deg,rgba(20,184,166,0.14),rgba(56,189,248,0.1),rgba(16,185,129,0.06))]",
    "hover:border-cyan-200/20 hover:text-white hover:before:opacity-100",
    size === "lg" && "py-2.5",
    isActive && "border-emerald-300/24 bg-[linear-gradient(120deg,rgba(16,185,129,0.22),rgba(56,189,248,0.11))] text-white shadow-[0_0_0_1px_rgba(16,185,129,0.16),0_18px_40px_rgba(3,20,40,0.42)]",
    className
  );

  if (render) {
    return React.cloneElement(render as React.ReactElement<any>, {
      ...props,
      title: tooltip,
      className: cn(classes, (render.props as any).className),
      children,
    });
  }

  return (
    <button type="button" title={tooltip} className={classes} {...props}>
      {children}
    </button>
  );
}

export function SidebarMenuSub({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul data-slot="sidebar-menu-sub" className={cn("ml-4 mt-1.5 space-y-1.5 border-l border-cyan-200/14 pl-2", className)} {...props} />;
}

export function SidebarMenuSubItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li data-slot="sidebar-menu-sub-item" className={cn(className)} {...props} />;
}

type SidebarMenuSubButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
  render?: React.ReactElement<any>;
};

export function SidebarMenuSubButton({
  className,
  isActive,
  render,
  children,
  ...props
}: SidebarMenuSubButtonProps) {
  const classes = cn(
    "group relative flex w-full items-center rounded-lg border border-transparent px-3 py-2 text-sm text-slate-400 transition-all",
    "hover:border-cyan-200/18 hover:bg-cyan-300/6 hover:text-white",
    isActive && "border-cyan-300/24 bg-cyan-300/10 text-white",
    className
  );

  if (render) {
    return React.cloneElement(render as React.ReactElement<any>, {
      ...props,
      className: cn(classes, (render.props as any).className),
      children,
    });
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
