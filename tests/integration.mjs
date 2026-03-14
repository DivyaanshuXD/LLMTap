/**
 * Integration test: starts the collector, sends mock spans, and verifies
 * they appear in the API.
 *
 * Run with: node tests/integration.mjs
 */

import { createServer } from "../packages/collector/dist/index.mjs";

const PORT = 4799; // Use a different port for testing

async function main() {
  console.log("Starting integration test...\n");

  // 1. Start the collector server
  const { app } = await createServer({ port: PORT, quiet: true });
  const address = await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`[OK] Collector started at ${address}`);

  try {
    // Reset any existing data first (clean slate for testing)
    await fetch(`http://127.0.0.1:${PORT}/v1/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });

    // 2. Send mock spans via HTTP POST (simulating the SDK's transport)
    const mockSpans = [
      {
        spanId: "test-span-001",
        traceId: "test-trace-001",
        name: "chat gpt-4o",
        operationName: "chat",
        providerName: "openai",
        startTime: Date.now() - 2000,
        endTime: Date.now() - 500,
        duration: 1500,
        requestModel: "gpt-4o",
        responseModel: "gpt-4o-2024-11-20",
        inputTokens: 150,
        outputTokens: 80,
        totalTokens: 230,
        inputCost: 0.000375,
        outputCost: 0.0008,
        totalCost: 0.001175,
        status: "ok",
        inputMessages: [
          { role: "user", content: "What is TypeScript?" }
        ],
        outputMessages: [
          { role: "assistant", content: "TypeScript is a typed superset of JavaScript." }
        ],
      },
      {
        spanId: "test-span-002",
        traceId: "test-trace-001",
        parentSpanId: "test-span-001",
        name: "chat gpt-4o-mini",
        operationName: "chat",
        providerName: "openai",
        startTime: Date.now() - 400,
        endTime: Date.now() - 100,
        duration: 300,
        requestModel: "gpt-4o-mini",
        responseModel: "gpt-4o-mini",
        inputTokens: 50,
        outputTokens: 30,
        totalTokens: 80,
        inputCost: 0.0000075,
        outputCost: 0.000018,
        totalCost: 0.0000255,
        status: "ok",
      },
      {
        spanId: "test-span-003",
        traceId: "test-trace-002",
        name: "chat claude-sonnet-4-20250514",
        operationName: "chat",
        providerName: "anthropic",
        startTime: Date.now() - 3000,
        endTime: Date.now() - 1000,
        duration: 2000,
        requestModel: "claude-sonnet-4-20250514",
        responseModel: "claude-sonnet-4-20250514",
        inputTokens: 200,
        outputTokens: 150,
        totalTokens: 350,
        inputCost: 0.0006,
        outputCost: 0.00225,
        totalCost: 0.00285,
        status: "error",
        errorType: "APIError",
        errorMessage: "Rate limit exceeded",
        toolCalls: [
          {
            id: "tool-1",
            name: "search_web",
            arguments: '{"query": "LLM observability"}',
          }
        ],
      },
    ];

    const ingestRes = await fetch(`http://127.0.0.1:${PORT}/v1/spans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spans: mockSpans }),
    });
    const ingestData = await ingestRes.json();
    assert(ingestRes.ok, "Ingest should return 200");
    assert(ingestData.accepted === 3, `Expected 3 accepted, got ${ingestData.accepted}`);
    console.log(`[OK] Ingested ${ingestData.accepted} spans`);

    // 3. Verify traces list
    const tracesRes = await fetch(`http://127.0.0.1:${PORT}/v1/traces`);
    const tracesData = await tracesRes.json();
    assert(tracesRes.ok, "Traces list should return 200");
    assert(tracesData.traces.length === 2, `Expected 2 traces, got ${tracesData.traces.length}`);
    console.log(`[OK] Found ${tracesData.traces.length} traces`);

    // Verify trace 1 has 2 spans and is "ok"
    const trace1 = tracesData.traces.find(t => t.traceId === "test-trace-001");
    assert(trace1, "Trace 1 should exist");
    assert(trace1.spanCount === 2, `Trace 1 should have 2 spans, got ${trace1.spanCount}`);
    assert(trace1.status === "ok", `Trace 1 should be ok, got ${trace1.status}`);
    console.log(`[OK] Trace 1 has correct span count and status`);

    // Verify trace 2 has 1 span and is "error"
    const trace2 = tracesData.traces.find(t => t.traceId === "test-trace-002");
    assert(trace2, "Trace 2 should exist");
    assert(trace2.spanCount === 1, `Trace 2 should have 1 span, got ${trace2.spanCount}`);
    assert(trace2.status === "error", `Trace 2 should be error, got ${trace2.status}`);
    console.log(`[OK] Trace 2 has correct span count and error status`);

    // 4. Verify spans for a specific trace
    const spansRes = await fetch(`http://127.0.0.1:${PORT}/v1/traces/test-trace-001/spans`);
    const spansData = await spansRes.json();
    assert(spansRes.ok, "Spans endpoint should return 200");
    assert(spansData.spans.length === 2, `Expected 2 spans, got ${spansData.spans.length}`);
    assert(spansData.spans[1].parentSpanId === "test-span-001", "Span 2 should have parent");
    console.log(`[OK] Trace spans endpoint returns correct data with parent-child`);

    // 5. Verify stats
    const statsRes = await fetch(`http://127.0.0.1:${PORT}/v1/stats`);
    const statsData = await statsRes.json();
    assert(statsRes.ok, "Stats should return 200");
    assert(statsData.totalSpans === 3, `Expected 3 total spans, got ${statsData.totalSpans}`);
    assert(statsData.totalTraces === 2, `Expected 2 total traces, got ${statsData.totalTraces}`);
    assert(statsData.errorCount === 1, `Expected 1 error, got ${statsData.errorCount}`);
    assert(statsData.totalCost > 0, "Total cost should be > 0");
    assert(statsData.byProvider.length === 2, `Expected 2 providers, got ${statsData.byProvider.length}`);
    console.log(`[OK] Stats endpoint returns correct aggregated data`);

    // 6. Verify span content (messages + tool calls)
    const span3Res = await fetch(`http://127.0.0.1:${PORT}/v1/traces/test-trace-002/spans`);
    const span3Data = await span3Res.json();
    const errorSpan = span3Data.spans[0];
    assert(errorSpan.errorType === "APIError", "Error type should be preserved");
    assert(errorSpan.toolCalls.length === 1, "Tool calls should be preserved");
    assert(errorSpan.toolCalls[0].name === "search_web", "Tool call name should match");
    console.log(`[OK] Span content (errors, tool calls) correctly persisted`);

    // 7. Verify health endpoint
    const healthRes = await fetch(`http://127.0.0.1:${PORT}/health`);
    const healthData = await healthRes.json();
    assert(healthData.status === "ok", "Health should return ok");
    console.log(`[OK] Health endpoint working`);

    // 8. Test reset
    const resetRes = await fetch(`http://127.0.0.1:${PORT}/v1/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    assert(resetRes.ok, "Reset should return 200");
    const afterResetTraces = await fetch(`http://127.0.0.1:${PORT}/v1/traces`);
    const afterResetData = await afterResetTraces.json();
    assert(afterResetData.traces.length === 0, "After reset, traces should be empty");
    console.log(`[OK] Reset endpoint clears all data`);

    console.log("\n========================================");
    console.log("  ALL 8 INTEGRATION TESTS PASSED");
    console.log("========================================\n");
  } finally {
    await app.close();
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

main().catch((err) => {
  console.error("\n[FAIL]", err.message);
  process.exit(1);
});
