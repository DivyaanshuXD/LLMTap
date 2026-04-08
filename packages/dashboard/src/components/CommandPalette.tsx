"use client";

import {
  AudioLines,
  BarChart2,
  LayoutGrid,
  PlaneTakeoff,
  Video,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ActionSearchBar, {
  type Action,
} from "@/components/kokonutui/action-search-bar";

export function CommandPalette() {
  const navigate = useNavigate();

  const actions = useMemo<Action[]>(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: <PlaneTakeoff className="h-4 w-4 text-[var(--color-accent)]" />,
        description: "operator surface",
        short: "G O",
        end: "Page",
      },
      {
        id: "traces",
        label: "Traces",
        icon: <LayoutGrid className="h-4 w-4 text-[var(--color-accent-2)]" />,
        description: "trace explorer",
        short: "G T",
        end: "Page",
      },
      {
        id: "economics",
        label: "Economics",
        icon: <BarChart2 className="h-4 w-4 text-[var(--color-accent)]" />,
        description: "cost intelligence",
        short: "G C",
        end: "Page",
      },
      {
        id: "models",
        label: "Models",
        icon: <Video className="h-4 w-4 text-[var(--color-text-primary)]" />,
        description: "model breakdown",
        short: "G M",
        end: "Page",
      },
      {
        id: "sessions",
        label: "Sessions",
        icon: <AudioLines className="h-4 w-4 text-[var(--color-accent-2)]" />,
        description: "grouped journeys",
        short: "G S",
        end: "Page",
      },
      {
        id: "settings",
        label: "Settings",
        icon: <LayoutGrid className="h-4 w-4 text-[var(--color-text-primary)]" />,
        description: "collector controls",
        short: "G X",
        end: "Page",
      },
    ],
    []
  );

  return (
    <ActionSearchBar
      actions={actions}
      placeholder="Type a command or search..."
      className="max-w-[44rem]"
      onAction={(action) => {
        switch (action.id) {
          case "overview":
            navigate("/");
            break;
          case "traces":
            navigate("/traces");
            break;
          case "economics":
            navigate("/costs");
            break;
          case "models":
            navigate("/models");
            break;
          case "sessions":
            navigate("/sessions");
            break;
          case "settings":
            navigate("/settings");
            break;
          default:
            break;
        }
      }}
    />
  );
}
