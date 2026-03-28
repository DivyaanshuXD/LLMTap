"use client";

import * as React from "react";
import {
  ChartNoAxesColumn,
  Cpu,
  DollarSign,
  List,
  MessageSquareMore,
  Settings2,
  TowerControl,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSectionGroup,
  useSidebar,
} from "@/components/ui/sidebar.tsx";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const { open, isMobile } = useSidebar();
  const expanded = isMobile || open;

  const navItems = [
    {
      title: "Overview",
      url: "/",
      icon: ChartNoAxesColumn,
      isActive: pathname === "/",
      end: true,
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
  ];

  return (
    <Sidebar intent="float" collapsible="dock" side="left" {...props}>
      <SidebarHeader>
        <NavLink
          to="/"
          end
          className={`group flex min-w-0 items-center rounded-[22px] border border-[#45A29E]/16 bg-[linear-gradient(180deg,rgba(31,40,51,0.88),rgba(11,12,16,0.94))] shadow-[inset_0_1px_0_rgba(197,198,199,0.04)] transition-all duration-200 hover:border-[#66FCF1]/20 hover:bg-[linear-gradient(180deg,rgba(36,47,58,0.98),rgba(16,18,23,0.98))] ${
            expanded ? "gap-3 px-3.5 py-3" : "mx-auto h-[3.5rem] w-[3.5rem] justify-center px-0 py-0"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#66FCF1,#45A29E)] text-[#0B0C10] shadow-[0_12px_28px_rgba(102,252,241,0.26)]">
            <TowerControl className="size-4" />
          </div>
          {expanded ? (
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium uppercase tracking-[0.3em] text-[#66FCF1]/72">
                LLMTAP
              </div>
              <div className="truncate text-xl font-semibold tracking-[-0.04em] text-white">
                Control Deck
              </div>
            </div>
          ) : null}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSectionGroup>
          <SidebarSection label="Control Deck">
            {navItems.map((item) => (
              <SidebarItem
                key={item.title}
                to={item.url}
                end={item.end}
                isCurrent={item.isActive}
                icon={<item.icon className="h-4 w-4" />}
                label={item.title}
              />
            ))}
          </SidebarSection>

          {expanded ? (
            <SidebarSection label="Runtime">
              <div className="rounded-[22px] border border-[#45A29E]/16 bg-[linear-gradient(180deg,rgba(31,40,51,0.86),rgba(11,12,16,0.92))] px-4 py-4">
                <div className="flex items-center gap-2 text-white">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#66FCF1] shadow-[0_0_14px_rgba(102,252,241,0.7)]" />
                  <span className="text-sm font-medium">Local collector active</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Runtime traces, token economics, and execution trees in one local-first surface.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#45A29E]/14 bg-[#0B0C10]/70 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[#66FCF1]/58">
                      Mode
                    </div>
                    <div className="mt-1 font-mono text-base text-[#C5C6C7]">LOCAL</div>
                  </div>
                  <div className="rounded-2xl border border-[#45A29E]/14 bg-[#0B0C10]/70 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[#66FCF1]/58">
                      Port
                    </div>
                    <div className="mt-1 font-mono text-base text-[#C5C6C7]">4781</div>
                  </div>
                </div>
              </div>
            </SidebarSection>
          ) : null}
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter>
        <div
          className={`rounded-[22px] border border-[#45A29E]/14 bg-[linear-gradient(180deg,rgba(31,40,51,0.86),rgba(11,12,16,0.92))] ${
            expanded ? "px-4 py-3" : "mx-auto flex h-[3.5rem] w-[3.5rem] items-center justify-center px-0 py-0"
          }`}
        >
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#45A29E]/16 bg-[#0B0C10]/70 text-[#66FCF1]">
                <TowerControl className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <SidebarLabel className="block text-sm font-medium text-white">
                  LLMTap
                </SidebarLabel>
                <SidebarLabel className="block text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Local-first observability
                </SidebarLabel>
              </div>
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#45A29E]/16 bg-[#0B0C10]/70 text-[#66FCF1]">
              <TowerControl className="h-4 w-4" />
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
