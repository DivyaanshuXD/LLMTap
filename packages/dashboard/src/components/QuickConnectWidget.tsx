import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  clearDemoTraffic,
  createDemoTraffic,
  createDemoTrace,
  fetchHealth,
  fetchTraces,
} from "@/api/client.ts";
import { useLiveRefreshState } from "@/hooks/useLiveRefresh.ts";

const STORAGE_KEY = "llmtap.quick-connect.minimized";

// ============================================================================
// DESIGN TOKENS - Deep Space Mission Control Theme
// ============================================================================
const cssVariables = `
  :root {
    --qc-bg-void: var(--color-ink);
    --qc-bg-deep: var(--color-deep);
    --qc-bg-elevated: var(--color-panel);
    --qc-bg-surface: var(--color-surface);
    --qc-bg-glass: rgba(var(--rgb-panel), 0.88);

    --qc-accent-primary: var(--color-accent-max);
    --qc-accent-secondary: var(--color-violet);
    --qc-accent-tertiary: var(--color-accent-2);
    --qc-accent-success: var(--color-success);
    --qc-accent-warning: var(--color-warning);
    --qc-accent-error: var(--color-error);

    --qc-text-primary: var(--color-text-primary);
    --qc-text-secondary: var(--color-text-secondary);
    --qc-text-tertiary: var(--color-text-tertiary);
    --qc-text-muted: var(--color-text-disabled);
    --qc-text-accent: var(--color-accent-max);

    --qc-border-subtle: rgba(var(--rgb-text-primary), 0.06);
    --qc-border-default: var(--border-dim);
    --qc-border-focus: var(--border-bright);
    --qc-border-accent: var(--border-default);

    --qc-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.32);
    --qc-shadow-md: 0 10px 20px rgba(0, 0, 0, 0.3);
    --qc-shadow-lg: 0 24px 56px rgba(0, 0, 0, 0.42);
    --qc-shadow-glow: 0 0 24px rgba(var(--rgb-accent), 0.12);
    --qc-shadow-success: 0 0 24px rgba(var(--rgb-accent), 0.12);

    /* Spacing Scale */
    --qc-space-1: 0.25rem;
    --qc-space-2: 0.5rem;
    --qc-space-3: 0.75rem;
    --qc-space-4: 1rem;
    --qc-space-5: 1.25rem;
    --qc-space-6: 1.5rem;
    --qc-space-8: 2rem;
    --qc-space-10: 2.5rem;

    /* Typography */
    --qc-font-sans: var(--font-body);
    --qc-font-mono: var(--font-mono);

    /* Motion */
    --qc-duration-fast: 150ms;
    --qc-duration-base: 250ms;
    --qc-duration-slow: 350ms;
    --qc-easing-default: cubic-bezier(0.4, 0, 0.2, 1);
    --qc-easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --qc-easing-out: cubic-bezier(0, 0, 0.2, 1);

    /* Dimensions */
    --qc-widget-width: 392px;
    --qc-launcher-size: 46px;
    --qc-radius-sm: 6px;
    --qc-radius-md: 8px;
    --qc-radius-lg: 12px;
    --qc-radius-xl: 16px;
  }
`;

// ============================================================================
// TYPES
// ============================================================================
type Mode = 'test' | 'observe';
type Provider = 'openai' | 'anthropic' | 'google' | 'compatible';
type AppStack = 'nextjs' | 'node' | 'express' | 'langchain' | 'custom';

interface ProviderConfig {
  id: Provider;
  name: string;
  defaultModel: string;
  packageName: string;
  snippet: string;
}

interface StackConfig {
  id: AppStack;
  name: string;
  files: string[];
  note: string;
  buildSnippet: (provider: ProviderConfig) => string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================
const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    packageName: 'openai',
    snippet: `import OpenAI from "openai";
import { wrap } from "@llmtap/sdk";

export const client = wrap(new OpenAI());`,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-7-sonnet-latest',
    packageName: '@anthropic-ai/sdk',
    snippet: `import Anthropic from "@anthropic-ai/sdk";
import { wrap } from "@llmtap/sdk";

export const client = wrap(new Anthropic());`,
  },
  {
    id: 'google',
    name: 'Gemini',
    defaultModel: 'gemini-2.5-flash',
    packageName: '@google/generative-ai',
    snippet: `import { GoogleGenerativeAI } from "@google/generative-ai";
import { wrap } from "@llmtap/sdk";

export const client = wrap(new GoogleGenerativeAI(process.env.GOOGLE_API_KEY));`,
  },
  {
    id: 'compatible',
    name: 'OpenAI-compatible',
    defaultModel: 'model-name',
    packageName: 'openai',
    snippet: `import OpenAI from "openai";
import { wrap } from "@llmtap/sdk";

export const client = wrap(new OpenAI({
  baseURL: "https://api.provider.com/v1",
  apiKey: process.env.PROVIDER_API_KEY,
}), { provider: "provider-name" });`,
  },
];

const installCommand = (provider: ProviderConfig) =>
  `pnpm add @llmtap/sdk ${provider.packageName}`;

const STACKS: StackConfig[] = [
  {
    id: 'nextjs',
    name: 'Next.js / Vercel app',
    files: ['app/api/chat/route.ts', 'src/lib/llm.ts', 'app/actions/*.ts'],
    note: 'Wrap the server-side client used by your route handler or server action.',
    buildSnippet: (provider) => `${installCommand(provider)}

// src/lib/llm.ts
${provider.snippet}

// app/api/chat/route.ts
import { client } from "@/lib/llm";

// Keep your existing request handler. Replace only the raw SDK client import
// with this wrapped client, then run one normal chat request.`,
  },
  {
    id: 'node',
    name: 'Node script / agent runner',
    files: ['src/agent.ts', 'src/lib/llm.ts', 'scripts/run-agent.ts'],
    note: 'Wrap the client once where your agent runner creates the model client.',
    buildSnippet: (provider) => `${installCommand(provider)}

// src/lib/llm.ts
${provider.snippet}

// src/agent.ts
import { client } from "./lib/llm";

// Use client exactly where your runner already calls the provider.`,
  },
  {
    id: 'express',
    name: 'Express / API server',
    files: ['src/server.ts', 'src/routes/chat.ts', 'src/services/ai.ts'],
    note: 'Wrap inside the API service layer, not inside the LLMTap folder.',
    buildSnippet: (provider) => `${installCommand(provider)}

// src/services/ai.ts
${provider.snippet}

// src/routes/chat.ts
import { client } from "../services/ai";

// Your route keeps the same response flow. Only the provider client is wrapped.`,
  },
  {
    id: 'langchain',
    name: 'LangChain / workflow',
    files: ['src/chains/*.ts', 'src/agent.ts', 'src/models.ts'],
    note: 'Wrap the underlying provider SDK client before your chain or graph invokes it.',
    buildSnippet: (provider) => `${installCommand(provider)}

// src/models.ts
${provider.snippet}

// Pass this wrapped provider client into your chain/model adapter where supported.
// If your framework hides the raw SDK, use LLMTap proxy or OTLP export instead.`,
  },
  {
    id: 'custom',
    name: 'Custom app',
    files: ['wherever your LLM client is created', 'provider factory', 'agent bootstrap'],
    note: 'Find the one file that constructs the provider client. Wrap there once.',
    buildSnippet: (provider) => `${installCommand(provider)}

// Your provider-client file
${provider.snippet}

// After this, run one real model call in that same app.`,
  },
];

// ============================================================================
// STYLES
// ============================================================================
const styles = `
  ${cssVariables}

  /* Animation Keyframes */
  @keyframes qc-slideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes qc-fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes qc-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes qc-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes qc-success-pop {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Widget Container */
  .qc-widget {
    position: fixed;
    bottom: var(--qc-space-6);
    right: var(--qc-space-6);
    z-index: 9999;
    font-family: var(--qc-font-sans);
    color: var(--qc-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Launcher Button */
  .qc-launcher {
    position: absolute;
    bottom: 0;
    right: 0;
    width: var(--qc-launcher-size);
    height: var(--qc-launcher-size);
    border-radius: 50%;
    background: linear-gradient(135deg, var(--qc-bg-elevated), var(--qc-bg-deep));
    border: 1px solid var(--qc-border-accent);
    box-shadow: var(--qc-shadow-lg), var(--qc-shadow-glow);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--qc-duration-base) var(--qc-easing-spring);
    animation: qc-fadeIn var(--qc-duration-base) var(--qc-easing-out);
  }

  .qc-launcher:hover {
    transform: scale(1.05);
    box-shadow: var(--qc-shadow-lg), 0 0 30px rgba(var(--rgb-accent-max), 0.22);
    border-color: var(--qc-accent-primary);
  }

  .qc-launcher:active {
    transform: scale(0.95);
  }

  .qc-launcher:focus-visible {
    outline: 2px solid var(--qc-accent-primary);
    outline-offset: 2px;
  }

  .qc-launcher-icon {
    width: 20px;
    height: 20px;
    color: var(--qc-accent-primary);
    transition: transform var(--qc-duration-base) var(--qc-easing-spring);
  }

  .qc-launcher:hover .qc-launcher-icon {
    transform: rotate(90deg);
  }

  /* Main Panel */
  .qc-panel {
    position: absolute;
    bottom: calc(var(--qc-launcher-size) + var(--qc-space-4));
    right: 0;
    width: min(var(--qc-widget-width), calc(100vw - 32px));
    max-height: calc(100vh - 100px);
    overflow: hidden;
    background: var(--qc-bg-glass);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--qc-border-default);
    border-radius: var(--qc-radius-xl);
    box-shadow: var(--qc-shadow-lg), 0 0 0 1px var(--qc-border-subtle);
    animation: qc-slideIn var(--qc-duration-slow) var(--qc-easing-spring);
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .qc-header {
    padding: var(--qc-space-4);
    border-bottom: 1px solid var(--qc-border-subtle);
    position: relative;
  }

  .qc-eyebrow {
    font-family: var(--qc-font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--qc-accent-primary);
    margin-bottom: var(--qc-space-2);
    display: flex;
    align-items: center;
    gap: var(--qc-space-2);
  }

  .qc-eyebrow::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--qc-accent-primary);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--qc-accent-primary);
  }

  .qc-title {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--qc-text-primary);
    margin: 0 0 var(--qc-space-1);
    line-height: 1.3;
  }

  .qc-subtitle {
    font-size: 0.8125rem;
    color: var(--qc-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .qc-close {
    position: absolute;
    top: var(--qc-space-4);
    right: var(--qc-space-4);
    width: 28px;
    height: 28px;
    border-radius: var(--qc-radius-md);
    background: transparent;
    border: 1px solid transparent;
    color: var(--qc-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
  }

  .qc-close:hover {
    background: var(--qc-bg-surface);
    border-color: var(--qc-border-default);
    color: var(--qc-text-primary);
  }

  .qc-close:focus-visible {
    outline: 2px solid var(--qc-border-focus);
    outline-offset: 2px;
  }

  /* Mode Switch */
  .qc-mode-switch {
    padding: 0 var(--qc-space-4);
    margin: var(--qc-space-3) 0;
  }

  .qc-segmented-control {
    display: flex;
    background: var(--qc-bg-deep);
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-md);
    padding: 3px;
    gap: 3px;
  }

  .qc-mode-btn {
    flex: 1;
    padding: var(--qc-space-2) var(--qc-space-3);
    border: none;
    background: transparent;
    color: var(--qc-text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--qc-radius-sm);
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
    position: relative;
  }

  .qc-mode-btn:hover:not(.active) {
    color: var(--qc-text-primary);
    background: rgba(var(--rgb-text-primary), 0.03);
  }

  .qc-mode-btn.active {
    background: var(--qc-bg-surface);
    color: var(--qc-text-primary);
    box-shadow: var(--qc-shadow-sm);
  }

  .qc-mode-btn.active::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: var(--qc-radius-sm);
    padding: 1px;
    background: linear-gradient(135deg, var(--qc-border-accent), transparent);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  .qc-mode-btn:focus-visible {
    outline: 2px solid var(--qc-border-focus);
    outline-offset: 2px;
  }

  /* Body Content */
  .qc-body {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--qc-space-4) var(--qc-space-4);
  }

  .qc-body::-webkit-scrollbar {
    width: 6px;
  }

  .qc-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .qc-body::-webkit-scrollbar-thumb {
    background: var(--qc-border-default);
    border-radius: 3px;
  }

  /* Form Elements */
  .qc-field {
    margin-bottom: var(--qc-space-3);
  }

  .qc-label {
    display: block;
    font-family: var(--qc-font-mono);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--qc-text-tertiary);
    margin-bottom: var(--qc-space-2);
  }

  .qc-input-wrapper {
    position: relative;
  }

  .qc-input,
  .qc-select,
  .qc-textarea {
    width: 100%;
    padding: 0.625rem var(--qc-space-3);
    background: var(--qc-bg-deep);
    border: 1px solid var(--qc-border-default);
    border-radius: var(--qc-radius-md);
    color: var(--qc-text-primary);
    font-size: 0.875rem;
    font-family: var(--qc-font-sans);
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
    box-sizing: border-box;
  }

  .qc-input:hover,
  .qc-select:hover,
  .qc-textarea:hover {
    border-color: var(--qc-border-default);
    background: var(--qc-bg-elevated);
  }

  .qc-input:focus,
  .qc-select:focus,
  .qc-textarea:focus {
    outline: none;
    border-color: var(--qc-border-focus);
    box-shadow: 0 0 0 3px rgba(var(--rgb-accent), 0.1);
  }

  .qc-input::placeholder,
  .qc-textarea::placeholder {
    color: var(--qc-text-muted);
  }

  .qc-select {
    cursor: pointer;
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--qc-text-tertiary) 50%),
      linear-gradient(135deg, var(--qc-text-tertiary) 50%, transparent 50%);
    background-repeat: no-repeat;
    background-position:
      calc(100% - 16px) calc(50% - 1px),
      calc(100% - 11px) calc(50% - 1px);
    background-size: 5px 5px, 5px 5px;
    padding-right: var(--qc-space-8);
  }

  .qc-textarea {
    min-height: 54px;
    resize: vertical;
    font-family: var(--qc-font-mono);
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  /* Password Toggle */
  .qc-password-toggle {
    position: absolute;
    right: var(--qc-space-2);
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--qc-text-tertiary);
    cursor: pointer;
    padding: var(--qc-space-1);
    border-radius: var(--qc-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
  }

  .qc-password-toggle:hover {
    color: var(--qc-text-primary);
    background: var(--qc-bg-surface);
  }

  /* Code Block */
  .qc-code-block {
    position: relative;
    background: var(--qc-bg-void);
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-md);
    overflow: hidden;
    margin: var(--qc-space-3) 0;
  }

  .qc-code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--qc-space-2) var(--qc-space-3);
    background: rgba(var(--rgb-text-primary), 0.02);
    border-bottom: 1px solid var(--qc-border-subtle);
  }

  .qc-code-label {
    font-family: var(--qc-font-mono);
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--qc-text-muted);
  }

  .qc-copy-btn {
    display: flex;
    align-items: center;
    gap: var(--qc-space-1);
    padding: var(--qc-space-1) var(--qc-space-2);
    background: transparent;
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-sm);
    color: var(--qc-text-secondary);
    font-size: 0.6875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
  }

  .qc-copy-btn:hover {
    background: var(--qc-bg-elevated);
    border-color: var(--qc-border-default);
    color: var(--qc-text-primary);
  }

  .qc-copy-btn.copied {
    color: var(--qc-accent-success);
    border-color: var(--qc-accent-success);
    background: rgba(var(--rgb-accent-2), 0.12);
  }

  .qc-code-content {
    padding: var(--qc-space-3);
    margin: 0;
    font-family: var(--qc-font-mono);
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--qc-text-secondary);
    overflow-x: auto;
    white-space: pre;
  }

  /* Checklist */
  .qc-checklist {
    list-style: none;
    padding: 0;
    margin: var(--qc-space-3) 0;
    display: flex;
    flex-direction: column;
    gap: var(--qc-space-2);
  }

  .qc-checklist-item {
    display: flex;
    align-items: flex-start;
    gap: var(--qc-space-3);
    font-size: 0.8125rem;
    color: var(--qc-text-secondary);
    line-height: 1.5;
  }

  .qc-check-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--qc-accent-success);
    margin-top: 1px;
  }

  /* Primary Button */
  .qc-btn-primary {
    width: 100%;
    min-height: 44px;
    padding: 0 var(--qc-space-4);
    background: linear-gradient(135deg, var(--qc-accent-secondary), var(--qc-accent-primary));
    border: 1px solid rgba(var(--rgb-text-primary), 0.12);
    border-radius: var(--radius-panel);
    color: var(--qc-bg-void);
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--qc-space-2);
    transition: all var(--qc-duration-base) var(--qc-easing-default);
    box-shadow: 0 2px 8px rgba(var(--rgb-violet), 0.26);
  }

  .qc-btn-primary svg {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
    stroke-width: 2.4;
  }

  .qc-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--rgb-violet), 0.34), 0 0 20px rgba(var(--rgb-accent), 0.16);
  }

  .qc-btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .qc-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .qc-btn-primary:focus-visible {
    outline: 2px solid var(--qc-border-focus);
    outline-offset: 2px;
  }

  /* Secondary Button */
  .qc-btn-secondary {
    width: 100%;
    padding: var(--qc-space-3) var(--qc-space-4);
    background: transparent;
    border: 1px solid var(--qc-border-default);
    border-radius: var(--qc-radius-md);
    color: var(--qc-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
    margin-top: var(--qc-space-3);
  }

  .qc-btn-secondary:hover {
    background: var(--qc-bg-elevated);
    border-color: var(--qc-border-default);
    color: var(--qc-text-primary);
  }

  /* Success State */
  .qc-success {
    text-align: center;
    padding: var(--qc-space-6) 0;
  }

  .qc-success-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--qc-space-4);
    color: var(--qc-accent-success);
    animation: qc-success-pop var(--qc-duration-slow) var(--qc-easing-spring);
  }

  .qc-success-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--qc-text-primary);
    margin-bottom: var(--qc-space-2);
  }

  .qc-success-text {
    font-size: 0.8125rem;
    color: var(--qc-text-secondary);
    margin-bottom: var(--qc-space-5);
    line-height: 1.5;
  }

  /* Info Note */
  .qc-note {
    display: flex;
    gap: var(--qc-space-2);
    padding: var(--qc-space-3);
    background: rgba(var(--rgb-accent), 0.05);
    border: 1px solid rgba(var(--rgb-accent), 0.1);
    border-radius: var(--qc-radius-md);
    margin-top: var(--qc-space-4);
  }

  .qc-note-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--qc-accent-primary);
    margin-top: 1px;
  }

  .qc-note-text {
    font-size: 0.75rem;
    line-height: 1.5;
    color: var(--qc-text-secondary);
    margin: 0;
  }

  /* Connection Doctor */
  .qc-doctor {
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-lg);
    background: linear-gradient(180deg, rgba(var(--rgb-surface), 0.46), rgba(var(--rgb-ink), 0.62));
    padding: var(--qc-space-3);
    margin-bottom: var(--qc-space-3);
  }

  .qc-doctor-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--qc-space-3);
    margin-bottom: var(--qc-space-3);
  }

  .qc-doctor-title {
    font-family: var(--qc-font-mono);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--qc-accent-primary);
  }

  .qc-doctor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .qc-doctor-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--qc-space-3);
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-md);
    background: rgba(var(--rgb-ink), 0.42);
    padding: 0.48rem var(--qc-space-3);
  }

  .qc-doctor-label {
    display: flex;
    align-items: center;
    gap: var(--qc-space-2);
    min-width: 0;
    color: var(--qc-text-secondary);
    font-size: 0.75rem;
  }

  .qc-doctor-value {
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--qc-font-mono);
    font-size: 0.68rem;
    color: var(--qc-text-tertiary);
  }

  .qc-doctor-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--qc-text-muted);
    flex: 0 0 auto;
  }

  .qc-doctor-dot.ok {
    background: var(--qc-accent-primary);
    box-shadow: 0 0 12px rgba(var(--rgb-accent), 0.7);
  }

  .qc-doctor-dot.warn {
    background: var(--qc-accent-warning);
    box-shadow: 0 0 12px rgba(var(--rgb-warning), 0.38);
  }

  .qc-doctor-dot.off {
    background: var(--qc-accent-error);
    box-shadow: 0 0 12px rgba(var(--rgb-error), 0.3);
  }

  .qc-demo-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--qc-space-2);
    margin-top: var(--qc-space-3);
  }

  .qc-btn-mini {
    min-height: 34px;
    flex: 1 1 0;
    border-radius: var(--qc-radius-md);
    border: 1px solid var(--qc-border-accent);
    background: rgba(var(--rgb-accent), 0.08);
    color: var(--qc-accent-primary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    font-family: var(--qc-font-mono);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0 var(--qc-space-2);
    text-transform: uppercase;
    transition: all var(--qc-duration-fast) var(--qc-easing-default);
  }

  .qc-btn-mini:hover:not(:disabled) {
    border-color: var(--qc-border-focus);
    background: rgba(var(--rgb-accent), 0.14);
    box-shadow: 0 0 18px rgba(var(--rgb-accent), 0.14);
  }

  .qc-btn-mini:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }

  .qc-btn-mini svg {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
    stroke-width: 2.4;
  }

  .qc-btn-mini .qc-spinner {
    width: 13px;
    height: 13px;
    margin-right: 0;
  }

  .qc-demo-status {
    min-width: 0;
    flex: 1 1 100%;
    font-size: 0.72rem;
    color: var(--qc-text-tertiary);
  }

  .qc-timeline {
    list-style: none;
    margin: var(--qc-space-2) 0 0;
    padding: var(--qc-space-2) 0 0;
    border-top: 1px solid var(--qc-border-subtle);
    display: grid;
    gap: var(--qc-space-2);
  }

  .qc-timeline-step {
    display: grid;
    grid-template-columns: 12px 1fr auto;
    align-items: center;
    gap: var(--qc-space-2);
    font-family: var(--qc-font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.06em;
    color: var(--qc-text-muted);
    text-transform: uppercase;
  }

  .qc-timeline-step::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--qc-text-muted);
  }

  .qc-timeline-step.done {
    color: var(--qc-text-secondary);
  }

  .qc-timeline-step.done::before {
    background: var(--qc-accent-primary);
    box-shadow: 0 0 12px rgba(var(--rgb-accent), 0.58);
  }

  .qc-timeline-meta {
    color: var(--qc-text-muted);
    text-transform: none;
    letter-spacing: 0;
  }

  /* Advanced Section */
  .qc-advanced {
    margin-top: var(--qc-space-4);
    padding-top: var(--qc-space-4);
    border-top: 1px solid var(--qc-border-subtle);
  }

  .qc-advanced-toggle {
    display: flex;
    align-items: center;
    gap: var(--qc-space-2);
    background: transparent;
    border: none;
    color: var(--qc-text-tertiary);
    font-size: 0.75rem;
    font-family: var(--qc-font-mono);
    cursor: pointer;
    padding: 0;
    transition: color var(--qc-duration-fast) var(--qc-easing-default);
  }

  .qc-advanced-toggle:hover {
    color: var(--qc-text-secondary);
  }

  .qc-advanced-chevron {
    width: 12px;
    height: 12px;
    transition: transform var(--qc-duration-base) var(--qc-easing-spring);
  }

  .qc-advanced-toggle.open .qc-advanced-chevron {
    transform: rotate(180deg);
  }

  .qc-advanced-content {
    margin-top: var(--qc-space-3);
    padding: var(--qc-space-3);
    background: var(--qc-bg-deep);
    border-radius: var(--qc-radius-md);
    font-size: 0.75rem;
    color: var(--qc-text-tertiary);
    line-height: 1.5;
    animation: qc-fadeIn var(--qc-duration-base) var(--qc-easing-out);
  }

  .qc-advanced-item {
    display: flex;
    align-items: center;
    gap: var(--qc-space-2);
    margin-bottom: var(--qc-space-2);
  }

  .qc-advanced-item:last-child {
    margin-bottom: 0;
  }

  .qc-advanced-dot {
    width: 4px;
    height: 4px;
    background: var(--qc-accent-primary);
    border-radius: 50%;
    opacity: 0.5;
  }

  /* Explanation Card */
  .qc-explanation {
    padding: var(--qc-space-3);
    background: var(--qc-bg-deep);
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-md);
    margin-bottom: var(--qc-space-3);
  }

  .qc-explanation-text {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--qc-text-secondary);
    margin: 0;
  }

  .qc-path-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--qc-space-2);
    margin-top: var(--qc-space-3);
  }

  .qc-path-pill {
    border: 1px solid var(--qc-border-subtle);
    border-radius: var(--qc-radius-sm);
    background: var(--qc-bg-surface);
    color: var(--qc-text-tertiary);
    font-family: var(--qc-font-mono);
    font-size: 0.625rem;
    letter-spacing: 0.04em;
    padding: 0.3125rem var(--qc-space-2);
  }

  .qc-stack-note {
    margin-top: var(--qc-space-2);
    color: var(--qc-text-tertiary);
    font-size: 0.74rem;
    line-height: 1.5;
  }

  /* Spinner */
  .qc-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--rgb-text-primary), 0.3);
    border-top-color: var(--qc-text-primary);
    border-radius: 50%;
    animation: qc-spin 0.8s linear infinite;
    margin-right: var(--qc-space-2);
  }
`;

// ============================================================================
// ICONS (Inline SVG for self-containment)
// ============================================================================
const Icons = {
  plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  checkCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  chevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function QuickConnectWidget() {
  // State
  const queryClient = useQueryClient();
  const liveState = useLiveRefreshState();
  const [isExpanded, setIsExpanded] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem(STORAGE_KEY) !== "true"
  );
  const [mode, setMode] = useState<Mode>('observe');
  const [provider, setProvider] = useState<Provider>('openai');
  const [stack, setStack] = useState<AppStack>('nextjs');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('Explain the benefits of observability in three sentences.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [demoStatus, setDemoStatus] = useState<"idle" | "running" | "traffic" | "clearing" | "sent" | "cleared" | "error">("idle");

  const panelRef = useRef<HTMLDivElement>(null);
  const healthQuery = useQuery({
    queryKey: ["quick-connect", "health"],
    queryFn: fetchHealth,
    refetchInterval: isExpanded ? 5000 : false,
    retry: 1,
  });
  const latestTraceQuery = useQuery({
    queryKey: ["quick-connect", "latest-trace"],
    queryFn: () => fetchTraces({ limit: 1, offset: 0 }),
    refetchInterval: isExpanded ? 5000 : false,
  });

  // Update model when provider changes
  useEffect(() => {
    const p = PROVIDERS.find(pr => pr.id === provider);
    if (p) setModel(p.defaultModel);
  }, [provider]);

  // Handle click outside to minimize (optional UX enhancement)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Optional: auto-minimize when clicking outside
        // setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Handlers
  const handleSubmit = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('API key required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
    }, 1500);
  }, [apiKey]);

  const handleCopy = useCallback(() => {
    const p = PROVIDERS.find(pr => pr.id === provider);
    const s = STACKS.find(st => st.id === stack);
    if (p && s) {
      navigator.clipboard.writeText(s.buildSnippet(p));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [provider, stack]);

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
      queryClient.invalidateQueries({ queryKey: ["traces"] }),
      queryClient.invalidateQueries({ queryKey: ["quick-connect", "latest-trace"] }),
    ]);
  }, [queryClient]);

  const handleCreateDemoTrace = useCallback(async () => {
    setDemoStatus("running");
    setError(null);
    try {
      await createDemoTrace({ provider, model });
      setDemoStatus("sent");
      await refreshDashboardData();
    } catch (err) {
      setDemoStatus("error");
      setError(err instanceof Error ? err.message : "Failed to create demo trace");
    }
  }, [model, provider, refreshDashboardData]);

  const handleCreateDemoTraffic = useCallback(async () => {
    setDemoStatus("traffic");
    setError(null);
    try {
      await createDemoTraffic({ provider, model });
      setDemoStatus("sent");
      await refreshDashboardData();
    } catch (err) {
      setDemoStatus("error");
      setError(err instanceof Error ? err.message : "Failed to create demo traffic");
    }
  }, [model, provider, refreshDashboardData]);

  const handleClearDemoTraffic = useCallback(async () => {
    setDemoStatus("clearing");
    setError(null);
    try {
      await clearDemoTraffic();
      setDemoStatus("cleared");
      await refreshDashboardData();
    } catch (err) {
      setDemoStatus("error");
      setError(err instanceof Error ? err.message : "Failed to clear demo traffic");
    }
  }, [refreshDashboardData]);

  const handleSwitchMode = useCallback(() => {
    setMode('observe');
    setSuccess(false);
  }, []);

  const reset = useCallback(() => {
    setSuccess(false);
    setError(null);
    setApiKey('');
  }, []);

  const currentProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
  const currentStack = STACKS.find(s => s.id === stack) || STACKS[0];
  const currentSnippet = currentStack.buildSnippet(currentProvider);
  const latestTrace = latestTraceQuery.data?.traces[0];
  const hasObservedTraffic = Boolean(latestTrace || liveState.lastEventAt);
  const collectorOnline = healthQuery.data?.status === "ok";
  const streamOnline = liveState.status === "connected";
  const lastTraceLabel = latestTrace
    ? latestTrace.name
    : latestTraceQuery.isLoading
      ? "checking"
      : "none yet";
  const demoStatusLabel =
    demoStatus === "running"
      ? "Writing one local sample trace..."
      : demoStatus === "traffic"
        ? "Simulating a multi-provider traffic burst..."
        : demoStatus === "clearing"
          ? "Clearing Quick Connect demo spans..."
          : demoStatus === "sent"
            ? "Demo traffic sent. Overview and Traces should update."
            : demoStatus === "cleared"
              ? "Demo spans cleared. Your real traces were left untouched."
              : demoStatus === "error"
                ? error || "Demo action failed. Collector may be offline."
                : "No API key needed. Demo writes local synthetic spans only.";

  // Render
  return (
    <>
      <style>{styles}</style>

      <div className="qc-widget" ref={panelRef}>
        {isExpanded ? (
          <div className="qc-panel" role="dialog" aria-modal="true" aria-labelledby="qc-title">
            {/* Header */}
            <header className="qc-header">
              <div className="qc-eyebrow">Quick Connect</div>
              <h2 id="qc-title" className="qc-title">
                {success ? 'Quick Connect preview ready' : 'Get your first trace'}
              </h2>
              <p className="qc-subtitle">
                {success 
                  ? 'The onboarding surface is ready. Next, wire real traffic through LLMTap.'
                  : 'Wrap your app client, then run one real request to populate the dashboard.'}
              </p>
              <button 
                className="qc-close" 
                onClick={() => {
                  setIsExpanded(false);
                  window.localStorage.setItem(STORAGE_KEY, "true");
                }}
                aria-label="Minimize widget"
                title="Minimize"
              >
                <Icons.x />
              </button>
            </header>

            {/* Mode Switch */}
            {!success && (
              <div className="qc-mode-switch">
                <div className="qc-segmented-control" role="tablist" aria-label="Connection mode">
                  <button
                    className={`qc-mode-btn ${mode === 'observe' ? 'active' : ''}`}
                    onClick={() => setMode('observe')}
                    role="tab"
                    aria-selected={mode === 'observe'}
                    aria-controls="qc-panel-observe"
                  >
                    Observe My App
                  </button>
                  <button
                    className={`qc-mode-btn ${mode === 'test' ? 'active' : ''}`}
                    onClick={() => setMode('test')}
                    role="tab"
                    aria-selected={mode === 'test'}
                    aria-controls="qc-panel-test"
                  >
                    Quick Test
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="qc-body">
              {success ? (
                <div className="qc-success">
                  <Icons.checkCircle />
                  <h3 className="qc-success-title">Preview complete</h3>
                  <p className="qc-success-text">
                    Quick Connect is staged in the product now. To observe real app traffic, route it through LLMTap with the SDK.
                  </p>
                  <button className="qc-btn-primary" onClick={handleSwitchMode}>
                    Set up app observation
                  </button>
                  <button className="qc-btn-secondary" onClick={reset}>
                    Run another test
                  </button>
                </div>
              ) : mode === 'test' ? (
                <div id="qc-panel-test" role="tabpanel">
                  {/* Provider Select */}
                  <div className="qc-field">
                    <label className="qc-label">Provider</label>
                    <select 
                      className="qc-select"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as Provider)}
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* API Key Input */}
                  <div className="qc-field">
                    <label className="qc-label">API Key</label>
                    <div className="qc-input-wrapper">
                      <input
                        type={showKey ? 'text' : 'password'}
                        className="qc-input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={`${currentProvider.name} API key`}
                        aria-label="API Key"
                      />
                      <button
                        className="qc-password-toggle"
                        onClick={() => setShowKey(!showKey)}
                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                        type="button"
                      >
                        {showKey ? <Icons.eyeOff /> : <Icons.eye />}
                      </button>
                    </div>
                  </div>

                  {/* Model Input */}
                  <div className="qc-field">
                    <label className="qc-label">Model <span style={{color: 'var(--qc-text-muted)'}}>(optional)</span></label>
                    <input
                      type="text"
                      className="qc-input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={currentProvider.defaultModel}
                    />
                  </div>

                  {/* Prompt Textarea */}
                  <div className="qc-field">
                    <label className="qc-label">Prompt <span style={{color: 'var(--qc-text-muted)'}}>(optional)</span></label>
                    <textarea
                      className="qc-textarea"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter a test prompt..."
                      rows={2}
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div style={{color: 'var(--qc-accent-error)', fontSize: '0.75rem', marginBottom: 'var(--qc-space-3)'}}>
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    className="qc-btn-primary" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><span className="qc-spinner" />Running test...</>
                    ) : (
                      <><Icons.zap /> Run test prompt</>
                    )}
                  </button>

                  {/* Note */}
                  <div className="qc-note">
                    <span className="qc-note-icon"><Icons.info /></span>
                    <p className="qc-note-text">
                      Quick Test is only a local check. Your real app still needs the SDK wrapper, proxy mode, or OTLP.
                    </p>
                  </div>
                </div>
              ) : (
                <div id="qc-panel-observe" role="tabpanel">
                  {/* Explanation */}
                  <div className="qc-explanation">
                    <p className="qc-explanation-text">
                      Do this in your app project, not the folder where you ran npx llmtap. Find the file that creates your LLM client and wrap it once.
                    </p>
                    <div className="qc-path-list" aria-label="Common files to wrap">
                      {currentStack.files.map((file) => (
                        <span className="qc-path-pill" key={file}>{file}</span>
                      ))}
                    </div>
                    <p className="qc-stack-note">{currentStack.note}</p>
                  </div>

                  <div className="qc-doctor" aria-label="Connection Doctor">
                    <div className="qc-doctor-head">
                      <div className="qc-doctor-title">Connection Doctor</div>
                      <span className="qc-doctor-value">localhost:4781</span>
                    </div>
                    <div className="qc-doctor-grid">
                      <div className="qc-doctor-item">
                        <span className="qc-doctor-label">
                          <span className={`qc-doctor-dot ${collectorOnline ? 'ok' : healthQuery.isError ? 'off' : 'warn'}`} />
                          Collector
                        </span>
                        <span className="qc-doctor-value">
                          {collectorOnline ? 'online' : healthQuery.isError ? 'offline' : 'checking'}
                        </span>
                      </div>
                      <div className="qc-doctor-item">
                        <span className="qc-doctor-label">
                          <span className={`qc-doctor-dot ${streamOnline ? 'ok' : liveState.status === 'reconnecting' ? 'warn' : 'off'}`} />
                          Live stream
                        </span>
                        <span className="qc-doctor-value">{liveState.status}</span>
                      </div>
                      <div className="qc-doctor-item">
                        <span className="qc-doctor-label">
                          <span className={`qc-doctor-dot ${hasObservedTraffic ? 'ok' : 'warn'}`} />
                          App traffic
                        </span>
                        <span className="qc-doctor-value">
                          {hasObservedTraffic ? 'observed' : 'awaiting'}
                        </span>
                      </div>
                      <div className="qc-doctor-item">
                        <span className="qc-doctor-label">
                          <span className={`qc-doctor-dot ${latestTrace ? 'ok' : 'warn'}`} />
                          Latest trace
                        </span>
                        <span className="qc-doctor-value" title={latestTrace?.name}>{lastTraceLabel}</span>
                      </div>
                    </div>
                    <div className="qc-demo-row">
                      <button
                        className="qc-btn-mini"
                        disabled={demoStatus === "running" || demoStatus === "traffic" || demoStatus === "clearing"}
                        onClick={handleCreateDemoTrace}
                        type="button"
                      >
                        {demoStatus === "running" ? <span className="qc-spinner" /> : <Icons.zap />}
                        Demo trace
                      </button>
                      <button
                        className="qc-btn-mini"
                        disabled={demoStatus === "running" || demoStatus === "traffic" || demoStatus === "clearing"}
                        onClick={handleCreateDemoTraffic}
                        type="button"
                      >
                        {demoStatus === "traffic" ? <span className="qc-spinner" /> : <Icons.zap />}
                        Simulate traffic
                      </button>
                      <button
                        className="qc-btn-mini"
                        disabled={demoStatus === "running" || demoStatus === "traffic" || demoStatus === "clearing"}
                        onClick={handleClearDemoTraffic}
                        type="button"
                      >
                        {demoStatus === "clearing" ? <span className="qc-spinner" /> : <Icons.x />}
                        Reset samples
                      </button>
                      <span className="qc-demo-status">
                        {demoStatusLabel}
                      </span>
                    </div>
                    <ol className="qc-timeline" aria-label="Setup diagnostics">
                      <li className={`qc-timeline-step ${collectorOnline ? 'done' : ''}`}>
                        <span>Collector booted</span>
                        <span className="qc-timeline-meta">{collectorOnline ? 'ok' : 'waiting'}</span>
                      </li>
                      <li className={`qc-timeline-step ${streamOnline ? 'done' : ''}`}>
                        <span>Live channel open</span>
                        <span className="qc-timeline-meta">{liveState.status}</span>
                      </li>
                      <li className={`qc-timeline-step ${hasObservedTraffic ? 'done' : ''}`}>
                        <span>First app trace</span>
                        <span className="qc-timeline-meta">{hasObservedTraffic ? 'seen' : 'pending'}</span>
                      </li>
                    </ol>
                  </div>

                  {/* App Shape Select */}
                  <div className="qc-field">
                    <label className="qc-label">App Shape</label>
                    <select
                      className="qc-select"
                      value={stack}
                      onChange={(e) => setStack(e.target.value as AppStack)}
                    >
                      {STACKS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Provider Select */}
                  <div className="qc-field">
                    <label className="qc-label">Your Provider</label>
                    <select 
                      className="qc-select"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as Provider)}
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Code Snippet */}
                  <div className="qc-code-block">
                    <div className="qc-code-header">
                      <span className="qc-code-label">Integration</span>
                      <button 
                        className={`qc-copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <><Icons.check /> Copied</>
                        ) : (
                          <><Icons.copy /> Copy</>
                        )}
                      </button>
                    </div>
                    <pre className="qc-code-content">{currentSnippet}</pre>
                  </div>

                  <div className="qc-note">
                    <span className="qc-note-icon"><Icons.info /></span>
                    <p className="qc-note-text">
                      Keep the API key in your app. LLMTap only wraps the client and listens to the local collector.
                    </p>
                  </div>
                </div>
              )}

              {/* Advanced Section */}
              {!success && (
                <div className="qc-advanced">
                  <button 
                    className={`qc-advanced-toggle ${showAdvanced ? 'open' : ''}`}
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    aria-expanded={showAdvanced}
                  >
                    <span>Advanced options</span>
                    <span className="qc-advanced-chevron"><Icons.chevronDown /></span>
                  </button>

                  {showAdvanced && (
                    <div className="qc-advanced-content">
                      <div className="qc-advanced-item">
                        <span className="qc-advanced-dot" />
                        <span>Proxy mode (coming soon)</span>
                      </div>
                      <div className="qc-advanced-item">
                        <span className="qc-advanced-dot" />
                        <span>OTLP export for existing telemetry pipelines</span>
                      </div>
                      <div className="qc-advanced-item">
                        <span className="qc-advanced-dot" />
                        <span>Self-hosted collector configuration</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            className="qc-launcher"
            onClick={() => {
              setIsExpanded(true);
              window.localStorage.setItem(STORAGE_KEY, "false");
            }}
            aria-label="Open Quick Connect"
            title="Quick Connect"
          >
            <span className="qc-launcher-icon"><Icons.plus /></span>
          </button>
        )}
      </div>
    </>
  );
}

// Named export for flexibility
export { QuickConnectWidget };
