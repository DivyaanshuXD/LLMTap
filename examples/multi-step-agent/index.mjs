/**
 * LLMTap Example: Multi-Step AI Agent
 *
 * Simulates an agent that uses tool calls, showing how LLMTap
 * captures the full agent workflow with parent-child relationships.
 *
 * Prerequisites:
 *   1. Set OPENAI_API_KEY environment variable
 *   2. Start the LLMTap collector: npx llmtap
 *
 * Usage:
 *   node index.mjs
 */

import OpenAI from "openai";
import { wrap, startTrace } from "@llmtap/sdk";

const client = wrap(new OpenAI());

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time",
      description: "Get the current time for a timezone",
      parameters: {
        type: "object",
        properties: {
          timezone: { type: "string", description: "Timezone like America/New_York" },
        },
        required: ["timezone"],
      },
    },
  },
];

// Simulated tool implementations
function getWeather(location) {
  const temps = { "London": "12°C, cloudy", "Tokyo": "22°C, sunny", "New York": "18°C, partly cloudy" };
  return temps[location] || `${Math.floor(Math.random() * 30)}°C`;
}

function getTime(timezone) {
  try {
    return new Date().toLocaleTimeString("en-US", { timeZone: timezone });
  } catch {
    return new Date().toLocaleTimeString();
  }
}

async function main() {
  console.log("Running multi-step agent with tool calls...\n");

  await startTrace("travel-assistant", async () => {
    const messages = [
      { role: "user", content: "What's the weather and time in London and Tokyo?" },
    ];

    // First call: model decides to use tools
    let response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
    });

    let msg = response.choices[0].message;
    messages.push(msg);

    // Process tool calls
    while (msg.tool_calls && msg.tool_calls.length > 0) {
      console.log(`Agent made ${msg.tool_calls.length} tool call(s)`);

      for (const toolCall of msg.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let result;

        if (toolCall.function.name === "get_weather") {
          result = getWeather(args.location);
          console.log(`  get_weather(${args.location}) -> ${result}`);
        } else if (toolCall.function.name === "get_time") {
          result = getTime(args.timezone);
          console.log(`  get_time(${args.timezone}) -> ${result}`);
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Follow-up call with tool results
      response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
      });

      msg = response.choices[0].message;
      messages.push(msg);
    }

    console.log("\nAgent response:", msg.content);
  });

  console.log("\n---");
  console.log("Open http://localhost:4781 to see the full agent trace!");
  console.log("The trace timeline will show each LLM call and tool invocation.");
}

main().catch(console.error);
