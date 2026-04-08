"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { NavLink, type NavLinkProps } from "react-router-dom";
import { StarsBackground } from "@/components/backgrounds/GravityStarsBackground.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { cn } from "@/lib/utils.ts";

const SIDEBAR_WIDTH = 272;
const SIDEBAR_DOCK_WIDTH = 96;
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  isOpenOnMobile: boolean;
  setIsOpenOnMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean;
  isOpen?: boolean;
  shortcut?: string;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  defaultOpen = true,
  isOpen: openProp,
  onOpenChange,
  className,
  style,
  children,
  shortcut = "b",
  ...props
}: SidebarProviderProps) {
  const isMobileValue = useIsMobile();
  const isMobile = isMobileValue ?? false;
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    const cookieMatch = document.cookie.match(
      new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]+)`)
    );
    if (!cookieMatch?.[1] || openProp !== undefined) return;
    setInternalOpen(cookieMatch[1] === "true");
  }, [openProp]);

  const open = openProp ?? internalOpen;

  const setOpen = React.useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value;
      if (onOpenChange) onOpenChange(next);
      else setInternalOpen(next);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [onOpenChange, open]
  );

  const isMobileRef = React.useRef(isMobile);
  isMobileRef.current = isMobile;

  const toggleSidebar = React.useCallback(() => {
    if (isMobileRef.current) setOpenMobile((prev) => !prev);
    else setOpen((prev) => !prev);
  }, [setOpen]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== shortcut.toLowerCase()) {
        return;
      }

      const active = document.activeElement;
      const isTextInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active?.getAttribute("contenteditable") === "true" ||
        active?.getAttribute("role") === "textbox";

      if (isTextInput) return;
      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggleSidebar]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      isOpenOnMobile: openMobile,
      setIsOpenOnMobile: setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [isMobile, open, openMobile, setOpen, toggleSidebar]
  );

  if (isMobileValue === undefined) return null;

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn("group/sidebar-root flex min-h-screen w-full text-[var(--color-text-primary)]", className)}
        style={
          {
            "--sidebar-width": `${SIDEBAR_WIDTH}px`,
            "--sidebar-width-dock": `${SIDEBAR_DOCK_WIDTH}px`,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.ComponentProps<"div"> & {
  intent?: "default" | "float" | "inset";
  collapsible?: "hidden" | "dock" | "none";
  side?: "left" | "right";
  closeButton?: boolean;
};

function SidebarChrome({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-[32px] border border-[var(--border-dim)]",
        "bg-[linear-gradient(180deg,rgba(var(--ch-bg-base),0.985),rgba(var(--ch-bg-panel),0.96)_42%,rgba(var(--ch-bg-base),0.995))]",
        "shadow-[0_28px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(var(--ch-text-primary),0.05)]",
        "transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.58]">
        <StarsBackground
          className="h-full w-full"
          speed={140}
          factor={0}
          starColor="rgba(var(--rgb-text-frost), 0.16)"
          pointerEvents={false}
          transparent
          blendMode="normal"
          fieldOpacity={0.72}
          layers={[
            { count: 110, size: 1, durationMultiplier: 1 },
            { count: 42, size: 2, durationMultiplier: 1.8 },
            { count: 16, size: 3, durationMultiplier: 2.6 },
          ]}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(var(--ch-bg-base),0.08),transparent_20%,rgba(var(--ch-bg-base),0.14)_100%)]" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 top-20 w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(var(--rgb-text-chrome),0.11),transparent)] opacity-30" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--ch-accent),0.22),transparent)]" />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

export function Sidebar({
  children,
  closeButton = true,
  collapsible = "dock",
  side = "left",
  intent = "float",
  className,
  ...props
}: SidebarProps) {
  const { isMobile, state, isOpenOnMobile, setIsOpenOnMobile } = useSidebar();
  const width = state === "collapsed" ? SIDEBAR_DOCK_WIDTH : SIDEBAR_WIDTH;

  if (collapsible === "none") {
    return (
      <aside
        data-slot="sidebar"
        data-state={state}
        className={cn("hidden h-screen md:block", className)}
        style={{ width: SIDEBAR_WIDTH }}
        {...props}
      >
        <SidebarChrome>{children}</SidebarChrome>
      </aside>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={isOpenOnMobile} onOpenChange={setIsOpenOnMobile}>
        <SheetContent
          side={side}
          className="w-[18rem] border-none bg-transparent p-3 shadow-none"
          aria-label="Sidebar"
        >
          <SidebarChrome className="rounded-[28px]">
            {children}
          </SidebarChrome>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : "expanded"}
      data-intent={intent}
      data-side={side}
      className={cn("group/sidebar relative hidden md:block", className)}
      {...props}
    >
      <div
        aria-hidden="true"
        className="transition-[width] duration-[240ms] ease-[var(--ease-out)]"
        style={{ width }}
      />
      <div
        className={cn(
          "fixed bottom-0 top-0 z-20 hidden p-3 md:flex transition-[width] duration-[240ms] ease-[var(--ease-out)]",
          side === "left" ? "left-0" : "right-0"
        )}
        style={{ width }}
      >
        <SidebarChrome>{children}</SidebarChrome>
      </div>
    </div>
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        "flex flex-col gap-3",
        collapsed ? "items-center px-0 py-4" : "px-4 py-4",
        className
      )}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
        collapsed ? "items-center px-0 pb-4" : "px-3 pb-4",
        className
      )}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        "mt-auto",
        collapsed ? "px-0 py-4" : "px-3 pb-4 pt-3",
        className
      )}
      {...props}
    />
  );
}

export function SidebarSectionGroup({
  className,
  ...props
}: React.ComponentProps<"section">) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  return (
    <section
      data-slot="sidebar-section-group"
      className={cn("flex w-full flex-col gap-2.5", collapsed && "items-center", className)}
      {...props}
    />
  );
}

interface SidebarSectionProps extends React.ComponentProps<"div"> {
  label?: string;
}

export function SidebarSection({
  label,
  className,
  children,
  ...props
}: SidebarSectionProps) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <div
      data-slot="sidebar-section"
      className={cn(
        "w-full rounded-[26px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.78),rgba(var(--ch-bg-base),0.9))] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.04)]",
        collapsed
          ? "mx-auto w-full border-transparent bg-transparent p-0 shadow-none"
          : "p-3.5",
        className
      )}
      {...props}
    >
      {!collapsed && label ? (
        <HeaderLabel>{label}</HeaderLabel>
      ) : null}
      <div className={cn("flex flex-col gap-2", collapsed ? "items-center" : "")}>
        {children}
      </div>
    </div>
  );
}

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]/65">
      {children}
    </div>
  );
}

type SidebarItemProps = Omit<NavLinkProps, "className" | "children"> & {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  isCurrent?: boolean;
  className?: string;
};

export function SidebarItem({
  icon,
  label,
  badge,
  isCurrent,
  className,
  ...props
}: SidebarItemProps) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  const content = (
    <NavLink
      aria-current={isCurrent ? "page" : undefined}
      className={({ isActive }) =>
        cn(
          "group/sidebar-item relative flex min-w-0 items-center overflow-hidden rounded-[20px] border text-sm transition-all duration-200",
          "duration-[var(--duration-base)] ease-[var(--ease-out)]",
          collapsed ? "mx-auto h-[3.75rem] w-[3.75rem] justify-center px-0" : "h-12 gap-3 px-3.5",
          "border-transparent text-[var(--color-text-secondary)]",
          collapsed
            ? "hover:bg-transparent hover:text-[var(--color-text-primary)]"
            : "hover:border-[var(--color-accent)]/18 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-text-primary)]",
          collapsed && (isCurrent || isActive)
            ? "bg-transparent text-[var(--color-text-primary)]"
            : undefined,
          !collapsed && (isCurrent || isActive) &&
            "border-[var(--border-default)] bg-[linear-gradient(135deg,rgba(var(--ch-accent),0.14),rgba(var(--ch-violet),0.06))] text-[var(--color-text-primary)] shadow-[0_0_0_1px_rgba(var(--ch-accent),0.08)]",
          className
        )
      }
      {...props}
    >
      <span
        data-slot="icon"
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.84),rgba(var(--ch-bg-base),0.98))] text-[var(--color-text-secondary)] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.05)] transition-[transform,border-color,background-color,color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)]",
          collapsed
            ? "h-11 w-11 group-hover/sidebar-item:-translate-y-[2px] group-hover/sidebar-item:scale-[1.05] group-hover/sidebar-item:border-[var(--border-default)] group-hover/sidebar-item:bg-[rgba(var(--ch-accent),0.07)] group-hover/sidebar-item:text-[var(--color-accent-max)] group-hover/sidebar-item:shadow-[0_0_0_1px_rgba(var(--ch-accent),0.06),0_0_18px_rgba(var(--ch-accent),0.08)]"
            : undefined,
          collapsed
            ? "group-aria-[current=page]/sidebar-item:border-[var(--border-default)] group-aria-[current=page]/sidebar-item:bg-[linear-gradient(180deg,rgba(var(--ch-accent),0.16),rgba(var(--ch-accent),0.06))] group-aria-[current=page]/sidebar-item:text-[var(--color-accent-max)] group-aria-[current=page]/sidebar-item:shadow-[0_0_0_1px_rgba(var(--ch-accent),0.08),0_0_18px_rgba(var(--ch-accent),0.08)]"
            : "group-aria-[current=page]/sidebar-item:border-[var(--border-default)] group-aria-[current=page]/sidebar-item:text-[var(--color-accent-max)]"
        )}
      >
        {icon}
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
          {badge ? (
            <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 text-[10px] font-mono text-[var(--color-text-tertiary)]">
              {badge}
            </span>
          ) : null}
        </>
      ) : null}
    </NavLink>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { state, isMobile } = useSidebar();
  if (state === "collapsed" && !isMobile) return null;

  return (
    <span
      data-slot="sidebar-label"
      className={cn("truncate", className)}
      {...props}
    />
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={props["aria-label"] ?? "Toggle Sidebar"}
      className={cn(
        "rounded-[var(--radius-panel)] border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.94),rgba(var(--ch-bg-base),0.96))] text-[var(--color-text-secondary)] shadow-[0_0_20px_rgba(var(--ch-accent),0.06)] hover:border-[var(--border-default)] hover:bg-[linear-gradient(180deg,var(--color-card),var(--color-panel))] hover:text-[var(--color-text-primary)]",
        className
      )}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) toggleSidebar();
      }}
      {...props}
    >
      {props.children ?? <PanelLeft className="h-4 w-4" />}
    </Button>
  );
}

export function SidebarRail({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      onClick={toggleSidebar}
      className={cn("hidden", className)}
      {...props}
    />
  );
}
