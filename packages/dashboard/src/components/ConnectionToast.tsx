import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLiveRefreshState } from "../hooks/useLiveRefresh.ts";

export function ConnectionToast() {
  const { status } = useLiveRefreshState();
  const prevStatus = useRef(status);

  useEffect(() => {
    const previous = prevStatus.current;
    prevStatus.current = status;

    if (
      previous === "connected" &&
      (status === "reconnecting" || status === "disconnected")
    ) {
      toast.error("Connection to collector lost", {
        id: "collector-connection",
        description: "Live updates will resume automatically when the stream reconnects.",
      });
    }

    if (
      (previous === "reconnecting" || previous === "disconnected") &&
      status === "connected"
    ) {
      toast.success("Connection restored", {
        id: "collector-connection",
        description: "Live spans are flowing again.",
      });
    }
  }, [status]);

  return null;
}
