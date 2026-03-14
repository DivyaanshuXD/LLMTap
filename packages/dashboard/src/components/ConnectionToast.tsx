import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { useLiveRefreshState } from "../hooks/useLiveRefresh.ts";

export function ConnectionToast() {
  const { status } = useLiveRefreshState();
  const prevStatus = useRef(status);
  const [toast, setToast] = useState<"lost" | "restored" | null>(null);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    // Show "lost" toast when connected -> reconnecting/disconnected
    if (
      prev === "connected" &&
      (status === "reconnecting" || status === "disconnected")
    ) {
      setToast("lost");
    }

    // Show "restored" toast when reconnecting/disconnected -> connected
    if (
      (prev === "reconnecting" || prev === "disconnected") &&
      status === "connected"
    ) {
      setToast("restored");
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
        >
          <div
            className={`flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-xl ${
              toast === "lost"
                ? "border-rose-400/20 bg-rose-950/80 text-rose-200"
                : "border-emerald-400/20 bg-emerald-950/80 text-emerald-200"
            }`}
          >
            {toast === "lost" ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Connection to collector lost</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                <span>Connection restored</span>
              </>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 rounded-lg p-1 transition-colors hover:bg-white/10"
            >
              &times;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
