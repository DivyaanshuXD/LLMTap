export interface CollectorDbInfo {
  path: string;
  sizeBytes: number;
  spanCount: number;
  traceCount: number;
  oldestSpan: number | null;
  newestSpan: number | null;
  walMode: string;
}

export async function isCollectorRunning(baseUrl = "http://localhost:4781"): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCollectorDbInfo(
  baseUrl = "http://localhost:4781"
): Promise<CollectorDbInfo | null> {
  try {
    const res = await fetch(`${baseUrl}/v1/db-info`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CollectorDbInfo;
  } catch {
    return null;
  }
}

export async function ingestSpans(
  spans: unknown[],
  baseUrl = "http://localhost:4781",
  batchSize = 250
): Promise<number> {
  let accepted = 0;

  for (let index = 0; index < spans.length; index += batchSize) {
    const batch = spans.slice(index, index + batchSize);
    const res = await fetch(`${baseUrl}/v1/spans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spans: batch }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Collector import failed with HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }

    const payload = (await res.json()) as { accepted?: number };
    accepted += payload.accepted ?? batch.length;
  }

  return accepted;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
