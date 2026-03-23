"use client";

import * as React from "react";
import {
  ChartNoAxesColumn,
  Cpu,
  DollarSign,
  List,
  MessageSquareMore,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  TowerControl,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { NavMain } from "@/components/shadcn-space/blocks/sidebar-01/nav-main.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const { open, isMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile || open;

  const data = {
    navMain: [
      {
        title: "Overview",
        url: "/",
        icon: ChartNoAxesColumn,
        isActive: pathname === "/",
      },
      {
        title: "Traces",
        url: "/traces",
        icon: List,
        isActive: pathname.startsWith("/traces") || pathname.startsWith("/trace/"),
      },
      {
        title: "Economics",
        url: "/costs",
        icon: DollarSign,
        isActive: pathname.startsWith("/costs"),
      },
      {
        title: "Models",
        url: "/models",
        icon: Cpu,
        isActive: pathname.startsWith("/models"),
      },
      {
        title: "Sessions",
        url: "/sessions",
        icon: MessageSquareMore,
        isActive: pathname.startsWith("/sessions"),
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
        isActive: pathname.startsWith("/settings"),
      },
    ],
  };

  return (
    <Sidebar
      variant="inset"
      className="border-cyan-300/10"
      {...props}
    >
      <SidebarHeader className="py-4">
        <SidebarMenu className="rounded-[24px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,17,38,0.84),rgba(2,10,26,0.86))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className={expanded ? "rounded-[18px] px-3 py-3" : "rounded-[18px] justify-center px-0 py-3"}
              render={<NavLink to="/" end />}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(45,212,191,0.9),rgba(56,189,248,0.95))] text-slate-950 shadow-[0_10px_26px_rgba(20,184,166,0.35)]">
                <TowerControl className="size-4" />
              </div>
              {expanded ? (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-200/65">LLMTAP</span>
                  <span className="truncate text-xl font-semibold tracking-[-0.04em] text-white">Mission Control</span>
                </div>
              ) : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 pb-3">
        <NavMain items={data.navMain} />

        {expanded ? (
          <div className="mt-4 rounded-[24px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(7,17,35,0.86),rgba(2,10,25,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.95)]" />
              <span className="text-sm">Local collector</span>
            </div>
            <p className="mt-2 text-base leading-relaxed text-slate-400">
              Real-time traces, token economics, and span internals in one operator surface.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,8,24,0.8))] px-3 py-2.5">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-cyan-200/55">Mode</div>
                <div className="mt-1 font-mono text-lg text-slate-200">LOCAL</div>
              </div>
              <div className="rounded-[16px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,8,24,0.8))] px-3 py-2.5">
                <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-cyan-200/55">Port</div>
                <div className="mt-1 font-mono text-lg text-slate-200">4781</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={expanded ? "mt-auto pt-4" : "mt-auto pt-3"}>
          <button
            type="button"
            onClick={toggleSidebar}
            className={
              expanded
                ? "w-full rounded-[14px] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,8,24,0.85))] px-4 py-2.5 text-left text-base text-slate-200 transition-colors hover:border-cyan-200/28"
                : "flex w-full items-center justify-center rounded-[14px] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,8,24,0.85))] px-0 py-2.5 text-slate-200 transition-colors hover:border-cyan-200/28"
            }
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <span className="flex items-center justify-between">
                <span>Collapse sidebar</span>
                <PanelLeftClose className="h-4 w-4" />
              </span>
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
