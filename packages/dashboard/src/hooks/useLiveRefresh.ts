import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSSEConnection, type Span } from "../api/client.ts";

export type LiveConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

interface LiveRefreshSnapshot {
  status: LiveConnectionStatus;
  reconnectAttempt: number;
  lastEventAt?: number;
}

const listeners = new Set<() => void>();
let snapshot: LiveRefreshSnapshot = {
  status: "connecting",
  reconnectAttempt: 0,
};

function emitSnapshot(next: LiveRefreshSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLiveRefreshState(): LiveRefreshSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot
  );
}

export function useLiveRefresh(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let disposed = false;
    const dirtyTraceIds = new Set<string>();

    const flushInvalidations = () => {
      flushTimer = null;
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["traces"] });
      for (const traceId of dirtyTraceIds) {
        queryClient.invalidateQueries({ queryKey: ["trace", traceId] });
      }
      dirtyTraceIds.clear();
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(flushInvalidations, 500);
    };

    const connect = () => {
      if (disposed) return;

      emitSnapshot({
        status: reconnectAttempt === 0 ? "connecting" : "reconnecting",
        reconnectAttempt,
        lastEventAt: snapshot.lastEventAt,
      });

      eventSource = createSSEConnection((span: Span) => {
        reconnectAttempt = 0;
        emitSnapshot({
          status: "connected",
          reconnectAttempt: 0,
          lastEventAt: Date.now(),
        });
        dirtyTraceIds.add(span.traceId);
        scheduleFlush();
      });

      eventSource.onopen = () => {
        reconnectAttempt = 0;
        emitSnapshot({
          status: "connected",
          reconnectAttempt: 0,
          lastEventAt: snapshot.lastEventAt,
        });
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;

        if (disposed) {
          return;
        }

        reconnectAttempt += 1;
        emitSnapshot({
          status: "reconnecting",
          reconnectAttempt,
          lastEventAt: snapshot.lastEventAt,
        });

        const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 15000);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushTimer) clearTimeout(flushTimer);
      emitSnapshot({
        status: "disconnected",
        reconnectAttempt: 0,
        lastEventAt: snapshot.lastEventAt,
      });
    };
  }, [queryClient]);
}
