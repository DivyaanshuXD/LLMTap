import { nanoid } from "nanoid";

/** Generate a 16-character span ID */
export function generateSpanId(): string {
  return nanoid(16);
}

/** Generate a 32-character trace ID */
export function generateTraceId(): string {
  return nanoid(32);
}
