import { LoaderCircle, RotateCw, Wifi, WifiOff } from "lucide-react";
import { useLiveRefreshState } from "../hooks/useLiveRefresh.ts";

export function LivePulse() {
  const { status, reconnectAttempt, lastEventAt } = useLiveRefreshState();

  const statusConfig = {
    connected: {
      label: "Live feed connected",
      icon: Wifi,
      dot: "bg-[#66FCF1]",
      halo: "bg-[#66FCF1]/25",
      ping: true,
      text: "text-[#66FCF1]",
    },
    connecting: {
      label: "Connecting to collector",
      icon: LoaderCircle,
      dot: "bg-[#45A29E]",
      halo: "bg-[#45A29E]/25",
      ping: false,
      text: "text-[#45A29E]",
    },
    reconnecting: {
      label: `Reconnecting${reconnectAttempt > 0 ? ` / attempt ${reconnectAttempt}` : ""}`,
      icon: RotateCw,
      dot: "bg-[#C5C6C7]",
      halo: "bg-[#C5C6C7]/20",
      ping: false,
      text: "text-[#C5C6C7]",
    },
    disconnected: {
      label: "Collector disconnected",
      icon: WifiOff,
      dot: "bg-[#C5C6C7]",
      halo: "bg-[#C5C6C7]/18",
      ping: false,
      text: "text-[#C5C6C7]",
    },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <div className={`status-chip ${statusConfig.text}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${statusConfig.halo} ${
            statusConfig.ping ? "animate-pulse opacity-80" : ""
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusConfig.dot}`}
        />
      </span>
      <Icon
        className={`h-3.5 w-3.5 ${status === "connecting" || status === "reconnecting" ? "animate-spin" : ""}`}
      />
      <span>{statusConfig.label}</span>
      {lastEventAt ? (
        <span className="hidden font-mono text-[11px] text-slate-500 sm:inline">
          {new Date(lastEventAt).toLocaleTimeString()}
        </span>
      ) : null}
    </div>
  );
}
