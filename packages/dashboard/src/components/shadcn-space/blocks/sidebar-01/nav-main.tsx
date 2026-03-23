"use client";

import { type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive?: boolean;
    }[];
  }[];
}) {
  const { open, isMobile } = useSidebar();
  const expanded = isMobile || open;

  return (
    <SidebarGroup className="relative rounded-[24px] border border-cyan-200/12 bg-[linear-gradient(180deg,rgba(3,18,38,0.66),rgba(1,9,24,0.7))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <SidebarGroupLabel className="px-2 pb-1">Control Deck</SidebarGroupLabel>
      <SidebarMenu className="relative mt-1">
        {expanded ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-6 top-3 w-px bg-[linear-gradient(180deg,rgba(56,189,248,0),rgba(56,189,248,0.22),rgba(56,189,248,0))]"
          />
        ) : null}
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={item.isActive}
              render={<NavLink to={item.url} end={item.url === "/"} />}
              className={expanded ? "h-12" : "h-12 justify-center px-0"}
            >
              {item.icon ? (
                <span
                  className={
                    expanded
                      ? "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.78),rgba(15,23,42,0.85))] text-slate-200"
                      : "flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(30,41,59,0.78),rgba(15,23,42,0.85))] text-slate-100"
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                </span>
              ) : null}
              {expanded ? <span className="font-medium">{item.title}</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
