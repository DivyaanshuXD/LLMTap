import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { deleteDemoSpans } from "../db.js";

const ClearDemoSchema = z.object({
  confirm: z.literal(true),
});

export async function registerDemoRoute(app: FastifyInstance): Promise<void> {
  app.post("/v1/demo/clear", async (request, reply) => {
    const parsed = ClearDemoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Must send { confirm: true } to clear demo traces",
      });
    }

    const deletedSpans = deleteDemoSpans();
    return reply.send({
      status: "ok",
      deletedSpans,
    });
  });
}
