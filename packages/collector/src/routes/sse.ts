import type { FastifyInstance } from "fastify";
import { ROUTES } from "@llmtap/shared";
import { onSpanEvent } from "../events.js";

const MAX_SSE_CONNECTIONS = 50;
let sseConnectionCount = 0;

export async function registerSSERoute(
  app: FastifyInstance
): Promise<void> {
  app.get(ROUTES.SSE_STREAM, async (request, reply) => {
    if (sseConnectionCount >= MAX_SSE_CONNECTIONS) {
      return reply.status(503).send({ error: "Too many SSE connections" });
    }
    sseConnectionCount++;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send initial heartbeat
    reply.raw.write("event: connected\ndata: {}\n\n");

    // Set up heartbeat interval
    const heartbeat = setInterval(() => {
      reply.raw.write(":heartbeat\n\n");
    }, 15000);

    // Subscribe to span events
    const unsubscribe = onSpanEvent((event) => {
      reply.raw.write(
        `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
      );
    });

    // Cleanup on disconnect
    request.raw.on("close", () => {
      sseConnectionCount--;
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
