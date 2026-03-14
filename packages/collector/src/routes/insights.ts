import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";

interface Insight {
  id: string;
  type: "cost_anomaly" | "error_pattern" | "model_recommendation" | "token_waste";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric?: string;
}

interface CostAnomalyRow {
  traceId: string;
  name: string;
  totalCost: number;
  avgCost: number;
}

interface ErrorPatternRow {
  errorType: string;
  errorCount: number;
  latestTime: number;
}

interface ModelUsageRow {
  model: string;
  provider: string;
  spanCount: number;
  avgTokens: number;
  totalCost: number;
  avgCost: number;
}

interface TokenWasteRow {
  name: string;
  model: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  spanCount: number;
  inputRatio: number;
}

let insightsCache: { data: { insights: Insight[] }; timestamp: number } | null = null;
const INSIGHTS_CACHE_TTL_MS = 30_000; // 30 seconds

export async function registerInsightsRoute(
  app: FastifyInstance
): Promise<void> {
  app.get("/v1/insights", async (_request, reply) => {
    const now = Date.now();
    if (insightsCache && (now - insightsCache.timestamp) < INSIGHTS_CACHE_TTL_MS) {
      return reply.send(insightsCache.data);
    }

    const db = getDb();
    const insights: Insight[] = [];
    const since24h = Date.now() - 24 * 60 * 60 * 1000;
    const since7d = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // 1. Cost anomalies: traces that cost >5x the average
    try {
      const anomalies = db
        .prepare(
          `
          WITH avg_cost AS (
            SELECT AVG(trace_cost) as avgCost
            FROM (
              SELECT traceId, SUM(totalCost) as trace_cost
              FROM spans
              WHERE startTime >= @since
              GROUP BY traceId
            )
          )
          SELECT
            s.traceId,
            MIN(s.name) as name,
            SUM(s.totalCost) as totalCost,
            (SELECT avgCost FROM avg_cost) as avgCost
          FROM spans s
          WHERE s.startTime >= @since
          GROUP BY s.traceId
          HAVING totalCost > (SELECT avgCost FROM avg_cost) * 5 AND totalCost > 0.01
          ORDER BY totalCost DESC
          LIMIT 3
        `
        )
        .all({ since: since24h }) as CostAnomalyRow[];

      for (const a of anomalies) {
        const multiplier = a.avgCost > 0 ? Math.round(a.totalCost / a.avgCost) : 0;
        insights.push({
          id: `cost_anomaly_${a.traceId}`,
          type: "cost_anomaly",
          severity: multiplier > 20 ? "critical" : "warning",
          title: `High cost trace detected`,
          description: `"${a.name}" cost $${a.totalCost.toFixed(4)} — ${multiplier}x your average trace cost of $${a.avgCost.toFixed(4)}.`,
          metric: `${multiplier}x avg`,
        });
      }
    } catch { /* ignore query errors */ }

    // 2. Error patterns: recurring errors
    try {
      const errors = db
        .prepare(
          `
          SELECT
            COALESCE(errorType, 'Unknown') as errorType,
            COUNT(*) as errorCount,
            MAX(startTime) as latestTime
          FROM spans
          WHERE status = 'error' AND startTime >= @since
          GROUP BY errorType
          HAVING errorCount >= 3
          ORDER BY errorCount DESC
          LIMIT 3
        `
        )
        .all({ since: since7d }) as ErrorPatternRow[];

      for (const e of errors) {
        insights.push({
          id: `error_pattern_${e.errorType}`,
          type: "error_pattern",
          severity: e.errorCount > 20 ? "critical" : "warning",
          title: `Recurring errors: ${e.errorType}`,
          description: `${e.errorCount} "${e.errorType}" errors in the last 7 days.`,
          metric: `${e.errorCount} errors`,
        });
      }
    } catch { /* ignore */ }

    // 3. Model recommendations: if an expensive model is used for simple (low-token) tasks
    try {
      const usage = db
        .prepare(
          `
          SELECT
            requestModel as model,
            providerName as provider,
            COUNT(*) as spanCount,
            AVG(totalTokens) as avgTokens,
            SUM(totalCost) as totalCost,
            AVG(totalCost) as avgCost
          FROM spans
          WHERE startTime >= @since AND status = 'ok'
          GROUP BY requestModel, providerName
          ORDER BY totalCost DESC
        `
        )
        .all({ since: since7d }) as ModelUsageRow[];

      // Find expensive models used for low-token tasks (likely could use a cheaper model)
      for (const u of usage) {
        const isExpensive =
          u.model.includes("gpt-4o") && !u.model.includes("mini") ||
          u.model.includes("gpt-4-") ||
          u.model.includes("claude-3-opus") ||
          u.model.includes("claude-opus") ||
          u.model.includes("claude-4") && !u.model.includes("haiku");
        const isLowToken = u.avgTokens < 500;

        if (isExpensive && isLowToken && u.spanCount >= 5 && u.totalCost > 0.05) {
          insights.push({
            id: `model_rec_${u.model}`,
            type: "model_recommendation",
            severity: "info",
            title: `Consider a lighter model for "${u.model}"`,
            description: `${u.spanCount} calls averaging ${Math.round(u.avgTokens)} tokens — a smaller model could save ~$${(u.totalCost * 0.7).toFixed(2)}.`,
            metric: `$${u.totalCost.toFixed(2)} spent`,
          });
        }
      }
    } catch { /* ignore */ }

    // 4. Token waste: system prompts that are disproportionately large compared to output
    try {
      const wasteRows = db
        .prepare(
          `
          SELECT
            name,
            requestModel as model,
            AVG(inputTokens) as avgInputTokens,
            AVG(outputTokens) as avgOutputTokens,
            COUNT(*) as spanCount,
            CASE WHEN AVG(outputTokens) > 0
              THEN CAST(AVG(inputTokens) AS REAL) / AVG(outputTokens)
              ELSE 0
            END as inputRatio
          FROM spans
          WHERE startTime >= @since AND status = 'ok' AND inputTokens > 0
          GROUP BY name, requestModel
          HAVING inputRatio > 10 AND avgInputTokens > 1000 AND spanCount >= 3
          ORDER BY inputRatio DESC
          LIMIT 3
        `
        )
        .all({ since: since7d }) as TokenWasteRow[];

      for (const w of wasteRows) {
        insights.push({
          id: `token_waste_${w.name}_${w.model}`,
          type: "token_waste",
          severity: "info",
          title: `High input-to-output token ratio`,
          description: `"${w.name}" uses ~${Math.round(w.avgInputTokens)} input tokens to generate ~${Math.round(w.avgOutputTokens)} output tokens (${Math.round(w.inputRatio)}:1 ratio). Consider compressing the system prompt.`,
          metric: `${Math.round(w.inputRatio)}:1 ratio`,
        });
      }
    } catch { /* ignore */ }

    const result = { insights };
    insightsCache = { data: result, timestamp: Date.now() };
    return reply.send(result);
  });
}
