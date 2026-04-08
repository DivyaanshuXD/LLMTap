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
          className={`group flex min-w-0 items-center rounded-[26px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.92),rgba(var(--ch-bg-panel),0.98))] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.05),0_24px_56px_rgba(0,0,0,0.22)] transition-[background,border-color,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:border-[var(--border-default)] hover:bg-[linear-gradient(180deg,var(--color-card),var(--color-panel))] ${
            expanded ? "gap-3.5 px-4 py-3.5" : "mx-auto h-[3.75rem] w-[3.75rem] justify-center px-0 py-0"
          }`}
        >
          <div className={`flex shrink-0 items-center justify-center rounded-[18px] border border-[var(--border-default)] bg-[linear-gradient(145deg,var(--color-accent-max),var(--color-accent-2))] text-[var(--color-bg-base)] shadow-[0_14px_30px_rgba(var(--ch-accent),0.22)] transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] group-hover:scale-[1.03] ${expanded ? "h-10 w-10" : "h-11 w-11"}`}>
            <TowerControl className="size-4" />
          </div>
          {expanded ? (
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--color-accent-max)]/72">
                LLMTAP
              </div>
              <div
                className="truncate text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-operator)",
                  fontSize: "18px",
                  fontWeight: 700,
                  lineHeight: "1",
                  letterSpacing: "-0.04em",
                }}
              >
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
              <div className="rounded-[24px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.9),rgba(var(--ch-bg-panel),0.98))] px-4 py-4">
                <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_14px_rgba(var(--ch-accent), 0.7)]" />
                  <span className="text-sm font-medium">Local collector active</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Runtime traces, token economics, and execution trees in one local-first surface.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--border-dim)] bg-[var(--color-bg-base)]/72 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]/58">
                      Mode
                    </div>
                    <div className="mt-1 font-mono text-base text-[var(--color-text-primary)]">LOCAL</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-dim)] bg-[var(--color-bg-base)]/72 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]/58">
                      Port
                    </div>
                    <div className="mt-1 font-mono text-base text-[var(--color-text-primary)]">4781</div>
                  </div>
                </div>
              </div>
            </SidebarSection>
          ) : null}
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter>
        <div
          className={`rounded-[24px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-surface),0.88),rgba(var(--ch-bg-panel),0.98))] shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.05)] transition-[background,border-color,box-shadow] duration-[240ms] ease-[var(--ease-out)] ${
            expanded ? "px-4 py-3" : "mx-auto flex h-[3.75rem] w-[3.75rem] items-center justify-center px-0 py-0"
          }`}
        >
          {expanded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-dim)] bg-[var(--color-bg-base)]/72 text-[var(--color-accent-max)]">
                <TowerControl className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <SidebarLabel className="block text-sm font-medium text-[var(--color-text-primary)]">
                  LLMTap
                </SidebarLabel>
                <SidebarLabel className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">
                  Local-first observability
                </SidebarLabel>
              </div>
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-[20px] border border-[var(--border-dim)] bg-[var(--color-bg-base)]/72 text-[var(--color-accent-max)]">
              <TowerControl className="h-4 w-4" />
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
