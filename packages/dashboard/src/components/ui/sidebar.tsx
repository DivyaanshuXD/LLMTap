"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { NavLink, type NavLinkProps } from "react-router-dom";
import { GravityStarsBackground } from "@/components/backgrounds/GravityStarsBackground.tsx";
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
const SIDEBAR_DOCK_WIDTH = 98;
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
        className={cn("group/sidebar-root flex min-h-screen w-full text-[#C5C6C7]", className)}
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
        "relative flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-[#45A29E]/18",
        "bg-[linear-gradient(180deg,rgba(31,40,51,0.94),rgba(11,12,16,0.98))]",
        "shadow-[0_28px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(197,198,199,0.04)] backdrop-blur-2xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-85">
        <GravityStarsBackground
          className="h-full w-full text-[#66FCF1]"
          starsCount={34}
          starsSize={1.35}
          starsOpacity={0.52}
          glowIntensity={8}
          movementSpeed={0.12}
          mouseInfluence={72}
          gravityStrength={42}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(102,252,241,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(69,162,158,0.14),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(102,252,241,0.45),transparent)]" />
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
        className="transition-[width] duration-200 ease-linear"
        style={{ width }}
      />
      <div
        className={cn(
          "fixed bottom-0 top-0 z-20 hidden p-3 md:flex",
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
        collapsed ? "items-center px-3 py-4" : "px-4 py-4",
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
        collapsed ? "items-center px-3 pb-4" : "px-3 pb-4",
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
        collapsed ? "px-3 py-4" : "px-3 pb-4 pt-3",
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
  return (
    <section
      data-slot="sidebar-section-group"
      className={cn("flex w-full flex-col gap-3", className)}
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
        "w-full rounded-[26px] border border-[#45A29E]/14 bg-[linear-gradient(180deg,rgba(31,40,51,0.78),rgba(11,12,16,0.88))] shadow-[inset_0_1px_0_rgba(197,198,199,0.04)]",
        collapsed
          ? "mx-auto w-auto border-transparent bg-transparent p-0 shadow-none"
          : "p-3",
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
    <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#66FCF1]/65">
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
          collapsed ? "h-[3.4rem] w-[3.4rem] justify-center px-0" : "h-12 gap-3 px-3.5",
          "border-transparent text-slate-300",
          collapsed
            ? "hover:bg-white/[0.03] hover:text-white"
            : "hover:border-[#66FCF1]/18 hover:bg-[#66FCF1]/8 hover:text-white",
          collapsed && (isCurrent || isActive)
            ? "bg-[rgba(102,252,241,0.05)] text-white"
            : undefined,
          !collapsed && (isCurrent || isActive) &&
            "border-[#45A29E]/22 bg-[linear-gradient(135deg,rgba(69,162,158,0.16),rgba(102,252,241,0.08))] text-white shadow-[0_0_0_1px_rgba(102,252,241,0.08)]",
          className
        )
      }
      {...props}
    >
      <span
        data-slot="icon"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(31,40,51,0.84),rgba(11,12,16,0.94))] text-slate-300 shadow-[inset_0_1px_0_rgba(197,198,199,0.04)]",
          collapsed
            ? "group-hover/sidebar-item:border-[#66FCF1]/14 group-hover/sidebar-item:bg-[#66FCF1]/8"
            : undefined,
          collapsed
            ? "group-aria-[current=page]/sidebar-item:border-[#45A29E]/14 group-aria-[current=page]/sidebar-item:bg-[linear-gradient(135deg,rgba(69,162,158,0.16),rgba(102,252,241,0.08))] group-aria-[current=page]/sidebar-item:text-[#66FCF1] group-aria-[current=page]/sidebar-item:shadow-[0_0_0_1px_rgba(102,252,241,0.06)]"
            : "group-aria-[current=page]/sidebar-item:border-[#45A29E]/18 group-aria-[current=page]/sidebar-item:text-[#66FCF1]"
        )}
      >
        {icon}
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
          {badge ? (
            <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400">
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
        "rounded-xl border-[#45A29E]/16 bg-[linear-gradient(180deg,rgba(31,40,51,0.94),rgba(11,12,16,0.96))] text-slate-300 shadow-[0_0_20px_rgba(102,252,241,0.08)] hover:border-[#66FCF1]/18 hover:bg-[linear-gradient(180deg,rgba(36,47,58,0.98),rgba(16,18,23,0.98))] hover:text-white",
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
