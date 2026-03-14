/**
 * LLMTap Example: OpenAI Basic Usage
 *
 * Prerequisites:
 *   1. Set OPENAI_API_KEY environment variable
 *   2. Start the LLMTap collector: npx llmtap
 *
 * Works with any OpenAI-compatible provider:
 *   - OpenAI:  just set OPENAI_API_KEY
 *   - Groq:    set OPENAI_API_KEY=gsk-... and OPENAI_BASE_URL=https://api.groq.com/openai/v1
 *   - DeepSeek: set OPENAI_API_KEY=sk-... and OPENAI_BASE_URL=https://api.deepseek.com
 *
 * Usage:
 *   node index.mjs
 */

import OpenAI from "openai";
import { wrap, startTrace } from "@llmtap/sdk";

// Auto-detect provider from base URL and pick a suitable model
const baseURL = process.env.OPENAI_BASE_URL || "";
let model = "gpt-4o-mini";
if (baseURL.includes("groq.com")) model = "llama-3.1-8b-instant";
else if (baseURL.includes("deepseek.com")) model = "deepseek-chat";

// Step 1: Create your OpenAI client as normal
const openai = new OpenAI();

// Step 2: Wrap it with LLMTap (one line!)
const client = wrap(openai);

console.log(`Provider: ${baseURL || "OpenAI"}`);
console.log(`Model:    ${model}\n`);

// Step 3: Use it exactly as before -- all calls are now traced
async function main() {
  console.log("Making a simple chat completion...\n");

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "user", content: "Explain what LLM observability means in one sentence." },
    ],
    max_tokens: 100,
  });

  console.log("Response:", response.choices[0].message.content);
  console.log("\n---\n");

  // Example with trace grouping: group multiple calls under one trace
  console.log("Running a multi-step trace...\n");

  await startTrace("summarize-pipeline", async () => {
    // Step 1: Generate a draft
    const draft = await client.chat.completions.create({
      model,
      messages: [
        { role: "user", content: "Write a short paragraph about AI agents." },
      ],
    });

    const draftText = draft.choices[0].message.content;
    console.log("Draft:", draftText?.slice(0, 80) + "...");

    // Step 2: Summarize the draft
    const summary = await client.chat.completions.create({
      model,
      messages: [
        { role: "user", content: `Summarize this in one sentence: ${draftText}` },
      ],
    });

    console.log("Summary:", summary.choices[0].message.content);
  });

  console.log("\n---");
  console.log("Open http://localhost:4781 to see your traces!");
}

main().catch(console.error);
