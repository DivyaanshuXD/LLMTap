import { getDb } from "./db.js";

interface SeedSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  operationName: string;
  providerName: string;
  requestModel: string;
  responseModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  status: string;
  startOffset: number;
  duration: number;
  inputMessages: string;
  outputMessages?: string;
  toolCalls?: string;
  temperature?: number;
  errorType?: string;
  errorMessage?: string;
}

interface SeedTrace {
  traceId: string;
  name: string;
  spans: SeedSpan[];
}

/** Generate realistic demo data so the dashboard looks alive on first visit */
export function seedDemoData(): void {
  const db = getDb();

  // Check if data already exists
  const count = db.prepare("SELECT COUNT(*) as c FROM spans").get() as { c: number };
  if (count.c > 0) return;

  const now = Date.now();
  const hour = 3600_000;

  // 6 traces spread across the last 24 hours with realistic LLM interactions
  const traces: SeedTrace[] = [
    {
      traceId: "tr_demo_chatbot_session_001",
      name: "customer-support-chat",
      spans: [
        {
          spanId: "sp_demo_001a",
          name: "classify-intent",
          operationName: "chat.completions.create",
          providerName: "openai",
          requestModel: "gpt-4o-mini",
          responseModel: "gpt-4o-mini-2024-07-18",
          inputTokens: 245,
          outputTokens: 32,
          totalTokens: 277,
          inputCost: 0.0000368,
          outputCost: 0.0000192,
          totalCost: 0.0000560,
          status: "ok",
          startOffset: -22 * hour,
          duration: 420,
          inputMessages: JSON.stringify([
            { role: "system", content: "You are an intent classifier. Classify the user message into: billing, technical, general, urgent." },
            { role: "user", content: "I can't access my account and I have a deadline in 2 hours!" }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "urgent" }
          ]),
          temperature: 0.0,
        },
        {
          spanId: "sp_demo_001b",
          parentSpanId: "sp_demo_001a",
          name: "generate-response",
          operationName: "chat.completions.create",
          providerName: "openai",
          requestModel: "gpt-4o",
          responseModel: "gpt-4o-2024-08-06",
          inputTokens: 580,
          outputTokens: 245,
          totalTokens: 825,
          inputCost: 0.00145,
          outputCost: 0.002450,
          totalCost: 0.003900,
          status: "ok",
          startOffset: -22 * hour + 450,
          duration: 1800,
          inputMessages: JSON.stringify([
            { role: "system", content: "You are a helpful customer support agent. The user has an urgent account access issue." },
            { role: "user", content: "I can't access my account and I have a deadline in 2 hours!" }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "I understand the urgency. Let me help you regain access to your account right away.\n\n1. First, try resetting your password at our recovery page\n2. If that doesn't work, I can verify your identity and unlock your account manually\n3. For your deadline, I can also temporarily extend any submission windows\n\nWhich would you like to try first?" }
          ]),
          temperature: 0.7,
        }
      ]
    },
    {
      traceId: "tr_demo_code_review_002",
      name: "ai-code-review",
      spans: [
        {
          spanId: "sp_demo_002a",
          name: "analyze-diff",
          operationName: "messages.create",
          providerName: "anthropic",
          requestModel: "claude-sonnet-4-20250514",
          responseModel: "claude-sonnet-4-20250514",
          inputTokens: 1850,
          outputTokens: 620,
          totalTokens: 2470,
          inputCost: 0.005550,
          outputCost: 0.009300,
          totalCost: 0.014850,
          status: "ok",
          startOffset: -18 * hour,
          duration: 3200,
          inputMessages: JSON.stringify([
            { role: "system", content: "You are a senior code reviewer. Analyze pull requests for bugs, security issues, and best practices." },
            { role: "user", content: "Review this PR diff:\n```diff\n+async function getUserData(userId) {\n+  const query = `SELECT * FROM users WHERE id = '${userId}'`;\n+  return db.query(query);\n+}\n```" }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "**Critical: SQL Injection Vulnerability**\n\nThe code directly interpolates `userId` into the SQL query string, creating a SQL injection attack vector.\n\n**Fix:** Use parameterized queries:\n```javascript\nasync function getUserData(userId) {\n  return db.query('SELECT * FROM users WHERE id = $1', [userId]);\n}\n```\n\n**Additional recommendations:**\n- Add input validation for userId format\n- Consider selecting specific columns instead of `SELECT *`\n- Add TypeScript types for the return value" }
          ]),
          temperature: 0.3,
        }
      ]
    },
    {
      traceId: "tr_demo_rag_pipeline_003",
      name: "rag-document-qa",
      spans: [
        {
          spanId: "sp_demo_003a",
          name: "embed-query",
          operationName: "chat.completions.create",
          providerName: "openai",
          requestModel: "gpt-4o-mini",
          responseModel: "gpt-4o-mini-2024-07-18",
          inputTokens: 45,
          outputTokens: 12,
          totalTokens: 57,
          inputCost: 0.0000068,
          outputCost: 0.0000072,
          totalCost: 0.0000140,
          status: "ok",
          startOffset: -12 * hour,
          duration: 180,
          inputMessages: JSON.stringify([
            { role: "user", content: "Rewrite as a search query: What are the company's Q3 revenue numbers?" }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "Q3 quarterly revenue financial results earnings" }
          ]),
          temperature: 0.0,
        },
        {
          spanId: "sp_demo_003b",
          parentSpanId: "sp_demo_003a",
          name: "synthesize-answer",
          operationName: "chat.completions.create",
          providerName: "openai",
          requestModel: "gpt-4o",
          responseModel: "gpt-4o-2024-08-06",
          inputTokens: 2100,
          outputTokens: 380,
          totalTokens: 2480,
          inputCost: 0.005250,
          outputCost: 0.003800,
          totalCost: 0.009050,
          status: "ok",
          startOffset: -12 * hour + 500,
          duration: 2800,
          inputMessages: JSON.stringify([
            { role: "system", content: "Answer the user's question using only the provided context. Cite sources." },
            { role: "user", content: "What are the company's Q3 revenue numbers?\n\nContext:\n[Doc 1] Q3 2024 Earnings Report: Total revenue reached $4.2B, up 32% YoY...\n[Doc 2] Segment breakdown: Cloud services $2.1B, Enterprise $1.4B, Consumer $0.7B..." }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "Based on the Q3 2024 Earnings Report, the company's Q3 revenue numbers are:\n\n- **Total Revenue:** $4.2 billion (up 32% year-over-year) [Doc 1]\n- **Cloud Services:** $2.1 billion [Doc 2]\n- **Enterprise:** $1.4 billion [Doc 2]\n- **Consumer:** $0.7 billion [Doc 2]\n\nCloud services represents the largest segment at 50% of total revenue." }
          ]),
          temperature: 0.2,
        }
      ]
    },
    {
      traceId: "tr_demo_agent_tools_004",
      name: "multi-step-agent",
      spans: [
        {
          spanId: "sp_demo_004a",
          name: "agent-planning",
          operationName: "chat.completions.create",
          providerName: "openai",
          requestModel: "gpt-4o",
          responseModel: "gpt-4o-2024-08-06",
          inputTokens: 890,
          outputTokens: 156,
          totalTokens: 1046,
          inputCost: 0.002225,
          outputCost: 0.001560,
          totalCost: 0.003785,
          status: "ok",
          startOffset: -8 * hour,
          duration: 1200,
          toolCalls: JSON.stringify([
            { id: "call_abc123", name: "get_weather", arguments: '{"location": "San Francisco, CA"}', result: '{"temp": 62, "condition": "foggy", "humidity": 78}' },
            { id: "call_def456", name: "get_calendar", arguments: '{"date": "today"}', result: '{"events": [{"time": "2pm", "title": "Team standup"}, {"time": "4pm", "title": "Design review"}]}' }
          ]),
          inputMessages: JSON.stringify([
            { role: "system", content: "You are a personal assistant with access to weather and calendar tools." },
            { role: "user", content: "What's my afternoon looking like? Should I bring an umbrella?" }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "Here's your afternoon:\n\n**Schedule:**\n- 2:00 PM - Team standup\n- 4:00 PM - Design review\n\n**Weather:** 62\u00b0F and foggy with 78% humidity. No rain expected, but a light jacket would be smart. No umbrella needed!" }
          ]),
          temperature: 0.5,
        }
      ]
    },
    {
      traceId: "tr_demo_error_005",
      name: "content-moderation",
      spans: [
        {
          spanId: "sp_demo_005a",
          name: "moderate-content",
          operationName: "messages.create",
          providerName: "anthropic",
          requestModel: "claude-sonnet-4-20250514",
          responseModel: "claude-sonnet-4-20250514",
          inputTokens: 320,
          outputTokens: 0,
          totalTokens: 320,
          inputCost: 0.000960,
          outputCost: 0,
          totalCost: 0.000960,
          status: "error",
          errorType: "RateLimitError",
          errorMessage: "Rate limit exceeded: Too many requests. Please retry after 30 seconds.",
          startOffset: -4 * hour,
          duration: 250,
          inputMessages: JSON.stringify([
            { role: "user", content: "Check this user-generated content for policy violations..." }
          ]),
          temperature: 0.0,
        }
      ]
    },
    {
      traceId: "tr_demo_summarize_006",
      name: "document-summarizer",
      spans: [
        {
          spanId: "sp_demo_006a",
          name: "chunk-summarize-1",
          operationName: "messages.create",
          providerName: "anthropic",
          requestModel: "claude-sonnet-4-20250514",
          responseModel: "claude-sonnet-4-20250514",
          inputTokens: 3200,
          outputTokens: 450,
          totalTokens: 3650,
          inputCost: 0.009600,
          outputCost: 0.006750,
          totalCost: 0.016350,
          status: "ok",
          startOffset: -2 * hour,
          duration: 2400,
          inputMessages: JSON.stringify([
            { role: "system", content: "Summarize the following document chunk concisely." },
            { role: "user", content: "Chapter 1: The integration of large language models into enterprise workflows has fundamentally changed how organizations approach knowledge management..." }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "This chapter discusses how LLM adoption in enterprises has transformed knowledge management, shifting from static document repositories to dynamic, queryable knowledge systems. Key themes: reduced onboarding time (40% avg), improved cross-team knowledge sharing, and new challenges around data privacy and model governance." }
          ]),
          temperature: 0.3,
        },
        {
          spanId: "sp_demo_006b",
          parentSpanId: "sp_demo_006a",
          name: "chunk-summarize-2",
          operationName: "messages.create",
          providerName: "anthropic",
          requestModel: "claude-sonnet-4-20250514",
          responseModel: "claude-sonnet-4-20250514",
          inputTokens: 2800,
          outputTokens: 380,
          totalTokens: 3180,
          inputCost: 0.008400,
          outputCost: 0.005700,
          totalCost: 0.014100,
          status: "ok",
          startOffset: -2 * hour + 2500,
          duration: 2100,
          inputMessages: JSON.stringify([
            { role: "system", content: "Summarize the following document chunk concisely." },
            { role: "user", content: "Chapter 2: Implementation best practices for LLM-powered systems require careful consideration of prompt engineering, evaluation frameworks, and cost optimization strategies..." }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "Chapter 2 covers LLM implementation best practices: structured prompt templates, A/B evaluation frameworks comparing model outputs, and cost optimization through model routing (using smaller models for simple tasks). Recommends starting with a pilot program before enterprise-wide rollout." }
          ]),
          temperature: 0.3,
        },
        {
          spanId: "sp_demo_006c",
          parentSpanId: "sp_demo_006a",
          name: "final-synthesis",
          operationName: "messages.create",
          providerName: "anthropic",
          requestModel: "claude-sonnet-4-20250514",
          responseModel: "claude-sonnet-4-20250514",
          inputTokens: 950,
          outputTokens: 280,
          totalTokens: 1230,
          inputCost: 0.002850,
          outputCost: 0.004200,
          totalCost: 0.007050,
          status: "ok",
          startOffset: -2 * hour + 5000,
          duration: 1500,
          inputMessages: JSON.stringify([
            { role: "system", content: "Combine these chapter summaries into a cohesive executive summary." },
            { role: "user", content: "[Summary 1] LLM adoption transforms enterprise knowledge management...\n[Summary 2] Implementation requires prompt engineering, evaluation, cost optimization..." }
          ]),
          outputMessages: JSON.stringify([
            { role: "assistant", content: "**Executive Summary**\n\nEnterprise LLM adoption is transforming knowledge management from static repositories to dynamic, queryable systems, yielding 40% faster onboarding and improved cross-team collaboration. Successful implementation requires structured prompt templates, rigorous A/B evaluation, and intelligent cost optimization through model routing. Organizations should begin with pilot programs, prioritizing data privacy and model governance frameworks before scaling enterprise-wide." }
          ]),
          temperature: 0.4,
        }
      ]
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO spans (
      spanId, traceId, parentSpanId, name, operationName, providerName,
      startTime, endTime, duration, requestModel, responseModel,
      inputTokens, outputTokens, totalTokens, inputCost, outputCost, totalCost,
      temperature, inputMessages, outputMessages, toolCalls,
      status, errorType, errorMessage
    ) VALUES (
      @spanId, @traceId, @parentSpanId, @name, @operationName, @providerName,
      @startTime, @endTime, @duration, @requestModel, @responseModel,
      @inputTokens, @outputTokens, @totalTokens, @inputCost, @outputCost, @totalCost,
      @temperature, @inputMessages, @outputMessages, @toolCalls,
      @status, @errorType, @errorMessage
    )
  `);

  const insertAll = db.transaction(() => {
    for (const trace of traces) {
      for (const span of trace.spans) {
        const startTime = now + span.startOffset;
        const endTime = startTime + span.duration;
        insertStmt.run({
          spanId: span.spanId,
          traceId: trace.traceId,
          parentSpanId: span.parentSpanId ?? null,
          name: span.name,
          operationName: span.operationName,
          providerName: span.providerName,
          startTime,
          endTime,
          duration: span.duration,
          requestModel: span.requestModel,
          responseModel: span.responseModel,
          inputTokens: span.inputTokens,
          outputTokens: span.outputTokens,
          totalTokens: span.totalTokens,
          inputCost: span.inputCost,
          outputCost: span.outputCost,
          totalCost: span.totalCost,
          temperature: span.temperature ?? null,
          inputMessages: span.inputMessages ?? null,
          outputMessages: span.outputMessages ?? null,
          toolCalls: span.toolCalls ?? null,
          status: span.status,
          errorType: span.errorType ?? null,
          errorMessage: span.errorMessage ?? null,
        });
      }
    }
  });

  insertAll();
}
