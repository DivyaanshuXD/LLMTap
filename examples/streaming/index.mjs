/**
 * LLMTap Example: Streaming
 *
 * Tests that LLMTap correctly captures tokens, cost, and output
 * from streaming responses — the most common way to use LLMs.
 *
 * Works with any OpenAI-compatible provider:
 *   - OpenAI:   just set OPENAI_API_KEY
 *   - Groq:     set OPENAI_API_KEY=gsk-... and OPENAI_BASE_URL=https://api.groq.com/openai/v1
 *   - DeepSeek: set OPENAI_API_KEY=sk-... and OPENAI_BASE_URL=https://api.deepseek.com
 *
 * Usage:
 *   node index.mjs
 */

import OpenAI from "openai";
import { wrap } from "@llmtap/sdk";

const baseURL = process.env.OPENAI_BASE_URL || "";
let model = "gpt-4o-mini";
if (baseURL.includes("groq.com")) model = "llama-3.1-8b-instant";
else if (baseURL.includes("deepseek.com")) model = "deepseek-chat";

const client = wrap(new OpenAI());

console.log(`Provider: ${baseURL || "OpenAI"}`);
console.log(`Model:    ${model}`);
console.log(`Mode:     STREAMING\n`);

async function main() {
  // --- Test 1: Basic streaming ---
  console.log("=== Test 1: Basic Streaming ===\n");

  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: "Count from 1 to 5, one number per line." }],
    max_tokens: 50,
    stream: true,
  });

  process.stdout.write("Response: ");
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) process.stdout.write(content);
  }
  console.log("\n");

  // --- Test 2: Streaming with longer output ---
  console.log("=== Test 2: Streaming (longer output) ===\n");

  const stream2 = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: "Explain what LLM observability is in 2-3 sentences." }],
    max_tokens: 150,
    stream: true,
  });

  process.stdout.write("Response: ");
  for await (const chunk of stream2) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) process.stdout.write(content);
  }
  console.log("\n");

  console.log("---");
  console.log("Open http://localhost:4781 to verify:");
  console.log("  - Tokens should be non-zero (not 0)");
  console.log("  - Cost should be calculated");
  console.log("  - Output content should be fully captured");
}

main().catch(console.error);
