import { expect, test } from "@playwright/test";

const now = Date.now();

const realSpanPayload = {
  spans: [
    {
      spanId: `span-real-${now}`,
      traceId: `trace-real-${now}`,
      name: "production-smoke",
      operationName: "chat.completions.create",
      providerName: "openai",
      startTime: now - 1200,
      endTime: now,
      duration: 1200,
      requestModel: "gpt-4o-mini",
      responseModel: "gpt-4o-mini",
      inputTokens: 120,
      outputTokens: 48,
      totalTokens: 168,
      inputCost: 0.0002,
      outputCost: 0.0003,
      totalCost: 0.0005,
      inputMessages: [{ role: "user", content: "hello from real e2e" }],
      outputMessages: [{ role: "assistant", content: "collector path is working" }],
      status: "ok",
      sessionId: "playwright-real-session",
      tags: {
        source: "playwright",
      },
    },
  ],
};

test("collector ingest updates the real dashboard live", async ({ page, request }) => {
  await page.goto("/");

  await expect(
    page.getByText("LLMTap is already running locally. The remaining change happens in your app.")
  ).toBeVisible();

  const ingestResponse = await request.post("/v1/spans", {
    data: realSpanPayload,
  });
  expect(ingestResponse.ok()).toBeTruthy();

  await expect(page.getByRole("link", { name: /production-smoke/i })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: /production-smoke/i }).click();

  await expect(page.getByText("Trace hierarchy")).toBeVisible();
  const spanButton = page.getByRole("button", { name: /production-smoke/i });
  await expect(spanButton).toBeVisible();
  await spanButton.click();
  await expect(page.getByText("collector path is working")).toBeVisible();
});
