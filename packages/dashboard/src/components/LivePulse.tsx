import { LoaderCircle, RotateCw, Wifi, WifiOff } from "lucide-react";
import { useLiveRefreshState } from "../hooks/useLiveRefresh.ts";

export function LivePulse() {
  const { status, reconnectAttempt, lastEventAt } = useLiveRefreshState();

  const statusConfig = {
    connected: {
      label: "Live feed connected",
      icon: Wifi,
      dot: "bg-emerald-300",
      halo: "bg-emerald-400/25",
      ping: true,
      text: "text-emerald-200",
    },
    connecting: {
      label: "Connecting to collector",
      icon: LoaderCircle,
      dot: "bg-sky-300",
      halo: "bg-sky-400/25",
      ping: false,
      text: "text-sky-200",
    },
    reconnecting: {
      label: `Reconnecting${reconnectAttempt > 0 ? ` / attempt ${reconnectAttempt}` : ""}`,
      icon: RotateCw,
      dot: "bg-amber-300",
      halo: "bg-amber-300/25",
      ping: false,
      text: "text-amber-200",
    },
    disconnected: {
      label: "Collector disconnected",
      icon: WifiOff,
      dot: "bg-rose-300",
      halo: "bg-rose-400/25",
      ping: false,
      text: "text-rose-200",
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
