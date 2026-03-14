import { EventEmitter } from "node:events";

/** Global event bus for SSE real-time updates */
const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

export type SpanEvent = {
  type: "span";
  data: unknown;
};

export function emitSpanEvent(data: unknown): void {
  eventBus.emit("span", { type: "span", data });
}

export function onSpanEvent(
  handler: (event: SpanEvent) => void
): () => void {
  eventBus.on("span", handler);
  return () => eventBus.off("span", handler);
}
