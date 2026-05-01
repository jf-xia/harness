import Anthropic from '@anthropic-ai/sdk';
import type { AgentEvent, ToolContext } from '../types.js';
import { ContextManager } from './context.js';
import { ToolRegistry } from '../tools/registry.js';
import { PermissionManager } from '../permissions/manager.js';

export interface AgentLoopOptions {
  model: string;
  systemPrompt: string;
  maxTokens: number;
  settingsPath: string;
  onEvent: (event: AgentEvent) => void;
  onPermissionRequest?: (
    toolName: string,
    scope: string,
    resource: string,
  ) => Promise<boolean>;
}

export class AgentLoop {
  private client: Anthropic;
  private context: ContextManager;
  private tools: ToolRegistry;
  private permissions: PermissionManager;
  private onEvent: (event: AgentEvent) => void;
  private onPermissionRequest?: AgentLoopOptions['onPermissionRequest'];
  private model: string;
  private maxTokens: number;
  private toolContext: ToolContext;

  constructor(opts: AgentLoopOptions) {
    this.client = new Anthropic();
    this.model = opts.model;
    this.maxTokens = opts.maxTokens;
    this.onEvent = opts.onEvent;
    this.onPermissionRequest = opts.onPermissionRequest;

    this.context = new ContextManager({
      systemPrompt: opts.systemPrompt,
      maxTokens: 200_000,
      reservedTokens: opts.maxTokens,
    });

    this.tools = new ToolRegistry();
    this.permissions = new PermissionManager(opts.settingsPath);
    this.toolContext = { workingDirectory: process.cwd() };
  }

  get registry(): ToolRegistry {
    return this.tools;
  }

  get contextManager(): ContextManager {
    return this.context;
  }

  async run(userMessage: string): Promise<void> {
    this.context.addMessage({ role: 'user', content: userMessage });
    this.onEvent({ type: 'thinking' });

    let continueLoop = true;

    while (continueLoop) {
      const response = await this.callAPI();

      if (response.type === 'error') {
        this.onEvent({ type: 'error', error: response.error });
        return;
      }

      const { content, stopReason } = response;

      // 发送文本内容
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          this.onEvent({ type: 'text', content: block.text });
        }
      }

      // 处理工具调用
      const toolUseBlocks = content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (toolUseBlocks.length > 0) {
        this.context.addMessage({ role: 'assistant', content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          this.onEvent({
            type: 'tool_start',
            name: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
          });

          const result = await this.executeTool(toolUse);

          toolResults.push(result);
          this.onEvent({
            type: 'tool_result',
            name: toolUse.name,
            output: (result.content as string) || '',
            isError: result.is_error || false,
          });
        }

        this.context.addMessage({ role: 'user', content: toolResults });
        continueLoop = true;
      } else {
        // 纯文本回复，结束循环
        const text = content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');

        this.context.addMessage({ role: 'assistant', content: text });
        continueLoop = false;
      }
    }

    this.onEvent({ type: 'done' });
  }

  private async callAPI(): Promise<
    | { type: 'ok'; content: Anthropic.ContentBlock[]; stopReason: string | null }
    | { type: 'error'; error: string }
  > {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: this.context.systemPrompt,
        messages: this.context.getMessages(),
        tools: this.tools.toAPITools(),
        max_tokens: this.maxTokens,
      });

      return {
        type: 'ok',
        content: response.content,
        stopReason: response.stop_reason,
      };
    } catch (err: any) {
      return { type: 'error', error: err.message || String(err) };
    }
  }

  private async executeTool(
    toolUse: Anthropic.ToolUseBlock,
  ): Promise<Anthropic.ToolResultBlockParam> {
    const tool = this.tools.get(toolUse.name);
    if (!tool) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `Error: Unknown tool "${toolUse.name}"`,
        is_error: true,
      };
    }

    // 权限检查
    const input = toolUse.input as Record<string, unknown>;
    const resource = String(input.path || input.command || input.pattern || '');

    for (const perm of tool.definition.permissions || []) {
      const action = this.permissions.check(perm.scope, resource);

      if (action === 'deny') {
        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'Error: Permission denied by policy',
          is_error: true,
        };
      }

      if (action === 'ask' || action === null) {
        const granted = this.onPermissionRequest
          ? await this.onPermissionRequest(toolUse.name, perm.scope, resource)
          : true; // 无 UI 时默认允许

        if (!granted) {
          return {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Error: Permission denied by user',
            is_error: true,
          };
        }
      }
    }

    try {
      const result = await tool.execute(input, this.toolContext);
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.error || result.output,
        is_error: !!result.error,
      };
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `Tool execution failed: ${err.message}`,
        is_error: true,
      };
    }
  }
}
