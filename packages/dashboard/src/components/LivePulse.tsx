import { useLiveRefreshState } from "../hooks/useLiveRefresh.ts";
import { LiveFeedIndicator } from "./system/LiveFeedIndicator.tsx";

export function LivePulse() {
  const { status, reconnectAttempt, lastEventAt } = useLiveRefreshState();

  const resolvedStatus =
    status === "connecting" ? "reconnecting" : status;
  const label =
    resolvedStatus === "connected"
      ? "Live feed connected"
      : resolvedStatus === "reconnecting"
        ? `Reconnecting${reconnectAttempt > 0 ? ` / attempt ${reconnectAttempt}` : ""}`
        : "Collector disconnected";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LiveFeedIndicator status={resolvedStatus} label={label} />
      {lastEventAt ? (
        <span className="mono-label hidden sm:inline">
          {new Date(lastEventAt).toLocaleTimeString()}
        </span>
      ) : null}
    </div>
  );
}
