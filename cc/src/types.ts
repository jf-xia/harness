import type Anthropic from '@anthropic-ai/sdk';

// ── Messages ──────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system' | 'debug';

export interface DisplayMessage {
  role: MessageRole;
  content: string;
  toolName?: string;
  isError?: boolean;
  debugData?: {
    label: string;
    file?: string;
    func?: string;
    line?: number;
    detail?: unknown;
  };
}

// ── Tools ─────────────────────────────────────────────────

export type PermissionScope = 'read' | 'write' | 'execute' | 'network';

export interface Permission {
  scope: PermissionScope;
  pattern?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool['input_schema'];
  permissions?: Permission[];
}

export interface ToolContext {
  workingDirectory: string;
}

export interface ToolResult {
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  definition: ToolDefinition;
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

// ── Agent Events ──────────────────────────────────────────

export type AgentEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; output: string; isError: boolean }
  | { type: 'thinking' }
  | { type: 'api_call'; model: string; messageCount: number; toolNames: string[] }
  | { type: 'api_response'; stopReason: string | null; blockTypes: string[]; iteration: number }
  | { type: 'error'; error: string }
  | { type: 'done' };

// ── Config ────────────────────────────────────────────────

export interface HarnessConfig {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  settingsPath: string;
}
