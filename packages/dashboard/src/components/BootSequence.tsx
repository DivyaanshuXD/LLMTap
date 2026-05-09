"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BOOT_LINES = [
  { text: "BIOS v4.1.2 - initializing neural substrate", tone: "dim" },
  { text: "memory subsystem online - 32GB heap allocated", tone: "ok" },
  { text: "SSE event bus initialized - port 4781", tone: "ok" },
  { text: "SQLite observer loaded - local trace store ready", tone: "ok" },
  { text: "> loading LLMTap intercept module", tone: "teal" },
  { text: "SDK wrappers armed - provider hooks standing by", tone: "ok" },
  { text: "OpenTelemetry exporter calibrated", tone: "ok" },
  { text: "> spawning local collector on localhost:4781", tone: "violet" },
  { text: "pricing engine loaded - model index synced", tone: "ok" },
  { text: "SYSTEM READY - awaiting first LLM call", tone: "amber" },
] as const;

const ENTER_DELAY = 45;
const EXIT_DURATION = 620;
const LINE_DELAY = 145;
const PROGRESS_DURATION = 2050;
const BOOT_STORAGE_KEY = "llmtap.boot-sequence.seen";

const KATAKANA =
  "\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3" +
  "\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8" +
  "\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB" +
  "0123456789ABCDEF";

function toneClass(tone: (typeof BOOT_LINES)[number]["tone"]) {
  switch (tone) {
    case "ok":
      return "text-[var(--color-accent)] before:mr-2 before:text-[var(--color-accent)] before:content-['[__OK__]']";
    case "teal":
      return "text-[var(--color-accent-max)]";
    case "violet":
      return "text-[var(--color-violet-max)]";
    case "amber":
      return "text-[var(--color-warning)]";
    default:
      return "text-[var(--color-text-tertiary)]";
  }
}

/** Displays the LLMTap diagnostic boot overlay on dashboard startup. */
export function BootSequence() {
  const [isFullRun, setIsFullRun] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem(BOOT_STORAGE_KEY) !== "true"
  );
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<"entering" | "running" | "exiting">("entering");
  const [lineCount, setLineCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dismissedRef = useRef(false);
  const timerRefs = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const rainTimerRef = useRef<number | null>(null);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach((timer) => window.clearTimeout(timer));
    timerRefs.current = [];
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }

    dismissedRef.current = true;
    window.localStorage.setItem(BOOT_STORAGE_KEY, "true");
    setPhase("exiting");
    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, EXIT_DURATION);
    timerRefs.current.push(timer);
  }, []);

  const restart = useCallback((fullRun: boolean) => {
    clearTimers();
    dismissedRef.current = false;
    setIsFullRun(fullRun);
    setLineCount(0);
    setProgress(0);
    setPhase("entering");
    setIsVisible(true);
    setRunId((value) => value + 1);
  }, [clearTimers]);

  useEffect(() => {
    const onReplayBoot = () => restart(true);
    window.addEventListener("llmtap:replay-boot-sequence", onReplayBoot);
    return () => {
      window.removeEventListener("llmtap:replay-boot-sequence", onReplayBoot);
    };
  }, [restart]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    timerRefs.current.push(
      window.setTimeout(() => setPhase("running"), ENTER_DELAY)
    );

    const cadence = reducedMotion ? 85 : isFullRun ? LINE_DELAY : 52;
    BOOT_LINES.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        setLineCount(index + 1);
      }, 180 + index * cadence);
      timerRefs.current.push(timer);
    });

    const startedAt = performance.now();
    const duration = reducedMotion ? 1300 : isFullRun ? PROGRESS_DURATION : 980;
    const tick = (time: number) => {
      const rawProgress = Math.min(1, (time - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      setProgress(easedProgress * 100);

      if (rawProgress < 1 && !dismissedRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
    timerRefs.current.push(window.setTimeout(dismiss, reducedMotion ? 1700 : isFullRun ? 2480 : 1220));

    const onKeyDown = () => dismiss();
    document.addEventListener("keydown", onKeyDown, { once: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimers();
    };
  }, [clearTimers, dismiss, isFullRun, isVisible, reducedMotion, runId]);

  useEffect(() => {
    if (!isVisible || reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    let width = 0;
    let height = 0;
    let drops: number[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: Math.ceil(width / 18) }, () => Math.random() * (height / 20));
    };

    const draw = () => {
      context.fillStyle = "rgba(var(--ch-bg-base), 0.18)";
      context.fillRect(0, 0, width, height);
      context.font = "13px 'DM Mono', monospace";

      drops.forEach((drop, index) => {
        const char = KATAKANA[Math.floor(Math.random() * KATAKANA.length)] ?? "0";
        context.fillStyle =
          Math.random() > 0.72
            ? "rgba(var(--ch-accent-max), 0.48)"
            : "rgba(var(--ch-accent), 0.18)";
        context.fillText(char, index * 18, drop * 20);

        if (drop * 20 > height && Math.random() > 0.975) {
          drops[index] = 0;
        } else {
          drops[index] = drop + 1;
        }
      });
    };

    resize();
    window.addEventListener("resize", resize);
    rainTimerRef.current = window.setInterval(draw, 42);

    return () => {
      window.removeEventListener("resize", resize);
      if (rainTimerRef.current !== null) {
        window.clearInterval(rainTimerRef.current);
        rainTimerRef.current = null;
      }
    };
  }, [isVisible, reducedMotion]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-label="LLMTap boot sequence"
      className={cn(
        "fixed inset-0 z-[10000] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[var(--color-ink)] px-5 text-[var(--color-text-primary)] transition-opacity duration-[620ms]",
        phase === "entering" && "opacity-0",
        phase === "running" && "opacity-100",
        phase === "exiting" && "opacity-0"
      )}
      onClick={dismiss}
      role="dialog"
    >
      <canvas
        aria-hidden="true"
        className={cn(
          "absolute inset-0 transition-opacity duration-[900ms]",
          phase === "running" ? "opacity-[0.22]" : "opacity-0"
        )}
        ref={canvasRef}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(var(--ch-accent), 0.10), transparent 38%), radial-gradient(circle at 70% 60%, rgba(var(--ch-violet), 0.10), transparent 36%)",
        }}
      />

      <div
        className={cn(
          "relative w-full max-w-[640px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-deep),0.94),rgba(var(--ch-bg-base),0.98))] shadow-[0_0_70px_rgba(var(--ch-accent),0.10),0_34px_120px_rgba(var(--ch-bg-base),0.54)] transition-all duration-[680ms] ease-[var(--ease-out)]",
          phase === "entering" && "translate-y-4 scale-[0.985] opacity-0",
          phase === "running" && "translate-y-0 scale-100 opacity-100",
          phase === "exiting" && "-translate-y-3 scale-[0.992] opacity-0"
        )}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.52)] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-error)] opacity-80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-warning)] opacity-80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] opacity-80" />
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
            Neural OS - LLMTap Observer v2.0
          </span>
        </div>

        <div className="min-h-[224px] px-5 py-5 font-mono text-[12px] leading-6">
          {BOOT_LINES.map((line, index) => (
            <span
              className={cn(
                "block translate-x-[-8px] opacity-0 transition-all duration-300 ease-[var(--ease-out)]",
                index < lineCount && "translate-x-0 opacity-100",
                toneClass(line.tone)
              )}
              key={line.text}
            >
              {line.text}
            </span>
          ))}
        </div>

        <div className="h-0.5 bg-[rgba(var(--ch-bg-lift),0.82)]">
          <div
            className="h-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-violet),var(--color-accent-max))] shadow-[0_0_18px_rgba(var(--ch-accent),0.44)] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        className={cn(
          "relative mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] transition-opacity duration-500",
          lineCount > 4 && phase === "running" ? "opacity-100" : "opacity-0"
        )}
      >
        Press any key or click to skip
      </div>
    </div>
  );
}
