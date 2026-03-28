import { expect, test, type Page } from "@playwright/test";

const traces = [
  {
    traceId: "trace-alpha",
    name: "research-agent",
    startTime: Date.now() - 60_000,
    status: "ok",
    spanCount: 3,
    totalTokens: 3200,
    totalCost: 0.0234,
    totalDuration: 1820,
  },
  {
    traceId: "trace-beta",
    name: "support-bot",
    startTime: Date.now() - 120_000,
    status: "error",
    spanCount: 2,
    totalTokens: 1800,
    totalCost: 0.0112,
    totalDuration: 2410,
  },
  {
    traceId: "trace-gamma",
    name: "docs-synth",
    startTime: Date.now() - 240_000,
    status: "ok",
    spanCount: 4,
    totalTokens: 4700,
    totalCost: 0.0318,
    totalDuration: 3275,
  },
];

const stats = {
  period: "24h",
  totalTraces: 24,
  totalSpans: 52,
  totalTokens: 48200,
  totalCost: 1.2834,
  avgDuration: 1640,
  errorCount: 3,
  errorRate: 0.06,
  byProvider: [
    {
      provider: "openai",
      spanCount: 28,
      totalTokens: 30100,
      totalCost: 0.9234,
      avgDuration: 1550,
    },
    {
      provider: "anthropic",
      spanCount: 14,
      totalTokens: 10100,
      totalCost: 0.2431,
      avgDuration: 1890,
    },
    {
      provider: "google",
      spanCount: 10,
      totalTokens: 8000,
      totalCost: 0.1169,
      avgDuration: 1380,
    },
  ],
  byModel: [
    {
      model: "gpt-4o",
      provider: "openai",
      spanCount: 16,
      totalTokens: 22000,
      totalCost: 0.7123,
      avgDuration: 1960,
    },
    {
      model: "gpt-4o-mini",
      provider: "openai",
      spanCount: 12,
      totalTokens: 8100,
      totalCost: 0.2111,
      avgDuration: 980,
    },
    {
      model: "claude-3-5-sonnet",
      provider: "anthropic",
      spanCount: 9,
      totalTokens: 9200,
      totalCost: 0.2431,
      avgDuration: 2110,
    },
    {
      model: "gemini-2.5-pro",
      provider: "google",
      spanCount: 7,
      totalTokens: 6200,
      totalCost: 0.1169,
      avgDuration: 1450,
    },
  ],
  costOverTime: [
    { timestamp: Date.now() - 5 * 60_000, cost: 0.12, tokens: 2000, spans: 4 },
    { timestamp: Date.now() - 4 * 60_000, cost: 0.24, tokens: 3100, spans: 6 },
    { timestamp: Date.now() - 3 * 60_000, cost: 0.19, tokens: 2800, spans: 5 },
    { timestamp: Date.now() - 2 * 60_000, cost: 0.38, tokens: 4300, spans: 7 },
    { timestamp: Date.now() - 60_000, cost: 0.29, tokens: 3700, spans: 6 },
  ],
};

async function mockDashboardApi(page: Page) {
  await page.addInitScript(() => {
    class FakeEventSource {
      onopen: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor() {
        setTimeout(() => this.onopen?.(new Event("open")), 0);
      }

      addEventListener() {
        return undefined;
      }

      close() {
        return undefined;
      }
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      writable: true,
      value: FakeEventSource,
    });
  });

  await page.route("**/v1/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/v1/stats") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stats),
      });
      return;
    }

    if (url.pathname === "/v1/insights") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          insights: [
            {
              id: "insight-1",
              type: "cost_anomaly",
              severity: "warning",
              title: "OpenAI spend spike",
              description: "Spend rose faster than token volume during the last hour.",
              metric: "+34%",
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === "/v1/traces") {
      const q = url.searchParams.get("q")?.toLowerCase() ?? "";
      const statusFilter = url.searchParams.get("status");
      const filtered = traces.filter((trace) => {
        const matchesQuery =
          !q ||
          trace.name.toLowerCase().includes(q) ||
          trace.traceId.toLowerCase().includes(q);
        const matchesStatus = !statusFilter || trace.status === statusFilter;
        return matchesQuery && matchesStatus;
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ traces: filtered, total: filtered.length }),
      });
      return;
    }

    if (url.pathname === "/v1/traces/trace-alpha/spans") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          spans: [
            {
              spanId: "span-root",
              traceId: "trace-alpha",
              name: "chat.completions.create",
              operationName: "chat.completions.create",
              providerName: "openai",
              startTime: Date.now() - 60_000,
              endTime: Date.now() - 58_200,
              duration: 1800,
              requestModel: "gpt-4o",
              responseModel: "gpt-4o",
              inputTokens: 900,
              outputTokens: 300,
              totalTokens: 1200,
              inputCost: 0.01,
              outputCost: 0.0134,
              totalCost: 0.0234,
              inputMessages: [
                { role: "user", content: "Summarize this project." },
              ],
              outputMessages: [
                { role: "assistant", content: "Here is the summary." },
              ],
              status: "ok",
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === "/v1/db-info") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          path: "C:/Users/example/.llmtap/llmtap.db",
          sizeBytes: 1200345,
          spanCount: 52,
          traceCount: 24,
          oldestSpan: Date.now() - 86_400_000,
          newestSpan: Date.now() - 60_000,
          walMode: "wal",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockDashboardApi(page);
});

test("overview filters stay URL-synced and trace detail opens", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Trace dispatch queue")).toBeVisible();
  await expect(page.getByRole("link", { name: /research-agent/i })).toBeVisible();

  await page.getByPlaceholder("Search traces, models, providers, errors").fill("support");
  await expect(page).toHaveURL(/q=support/);
  await expect(page.getByRole("link", { name: /support-bot/i })).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page).not.toHaveURL(/q=support/);

  await page.getByRole("link", { name: /research-agent/i }).click();
  await expect(page.getByText("Trace hierarchy")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /chat\.completions\.create/i })
  ).toBeVisible();
});

test("command palette navigation and traces comparison work", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("Type a command or search...").fill("economics");
  await expect(page.getByRole("option", { name: /Economics/i })).toBeVisible();
  await page.getByPlaceholder("Type a command or search...").press("Enter");
  await expect(
    page.getByText("Understand where every token is converting into spend.")
  ).toBeVisible();

  await page.goto("/traces");
  await page.getByRole("button", { name: "Select trace research-agent" }).click();
  await page.getByRole("button", { name: "Select trace support-bot" }).click();
  await page.getByRole("button", { name: "Compare traces" }).click();

  await expect(page.getByText("Side-by-side analysis")).toBeVisible();
});

test("settings keeps the onboarding and local operations visible", async ({ page }) => {
  await page.goto("/settings");

  await expect(
    page.getByText("LLMTap is already running locally. The remaining change happens in your app.")
  ).toBeVisible();
  await expect(page.getByText("Database status")).toBeVisible();
  await expect(page.getByText("Export data")).toBeVisible();
  await expect(page.getByText("Reset data")).toBeVisible();
});
