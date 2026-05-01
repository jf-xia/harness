import Anthropic from '@anthropic-ai/sdk';
import type { AgentEvent, ToolContext } from '../types.js';
import { ContextManager } from './context.js';
import { ToolRegistry } from '../tools/registry.js';
import { PermissionManager } from '../permissions/manager.js';
import { log } from '../logger.js';

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
    log.group('AGENT', 'AgentLoop initializing');
    log.data('AGENT', 'model', opts.model);
    log.data('AGENT', 'maxTokens', opts.maxTokens);
    log.data('AGENT', 'settingsPath', opts.settingsPath);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseURL = process.env.ANTHROPIC_BASE_URL;
    log.data('AGENT', 'ANTHROPIC_API_KEY', apiKey ? `${apiKey.slice(0, 8)}...` : '(not set)');
    log.data('AGENT', 'ANTHROPIC_BASE_URL', baseURL || '(not set)');

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
    log.groupEnd();
    log.success('AGENT', 'AgentLoop ready');
  }

  get registry(): ToolRegistry {
    return this.tools;
  }

  get contextManager(): ContextManager {
    return this.context;
  }

  async run(userMessage: string): Promise<void> {
    log.group('AGENT', `run() called with: "${userMessage.slice(0, 60)}${userMessage.length > 60 ? '...' : ''}"`);
    this.context.addMessage({ role: 'user', content: userMessage });
    this.onEvent({ type: 'thinking' });

    let continueLoop = true;
    let iteration = 0;

    while (continueLoop) {
      iteration++;
      log.step('AGENT', `--- Loop iteration #${iteration} ---`);

      const response = await this.callAPI();

      if (response.type === 'error') {
        log.error('AGENT', `API error: ${response.error}`);
        this.onEvent({ type: 'error', error: response.error });
        log.groupEnd();
        return;
      }

      const { content, stopReason } = response;
      log.data('AGENT', 'stopReason', stopReason);
      log.data('AGENT', 'content blocks', content.map(b => b.type));

      // 发送文本内容
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          log.info('AGENT', `Text response: "${block.text.slice(0, 80)}${block.text.length > 80 ? '...' : ''}"`);
          this.onEvent({ type: 'text', content: block.text });
        }
      }

      // 处理工具调用
      const toolUseBlocks = content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (toolUseBlocks.length > 0) {
        log.step('AGENT', `Found ${toolUseBlocks.length} tool_use block(s)`);
        this.context.addMessage({ role: 'assistant', content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          log.info('AGENT', `Tool call: ${toolUse.name}`, toolUse.input);
          this.onEvent({
            type: 'tool_start',
            name: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
          });

          const result = await this.executeTool(toolUse);

          toolResults.push(result);
          log.data('AGENT', `Tool ${toolUse.name} result`, result.is_error ? 'ERROR' : 'OK');
          this.onEvent({
            type: 'tool_result',
            name: toolUse.name,
            output: (result.content as string) || '',
            isError: result.is_error || false,
          });
        }

        this.context.addMessage({ role: 'user', content: toolResults });
        log.info('AGENT', 'Tool results added to context, continuing loop...');
        continueLoop = true;
      } else {
        // 纯文本回复，结束循环
        const text = content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');

        this.context.addMessage({ role: 'assistant', content: text });
        log.success('AGENT', `Final text response (${text.length} chars)`);
        continueLoop = false;
      }
    }

    log.success('AGENT', `run() complete after ${iteration} iteration(s)`);
    log.groupEnd();
    this.onEvent({ type: 'done' });
  }

  private async callAPI(): Promise<
    | { type: 'ok'; content: Anthropic.ContentBlock[]; stopReason: string | null }
    | { type: 'error'; error: string }
  > {
    const messages = this.context.getMessages();
    const tools = this.tools.toAPITools();
    log.step('API', `Calling ${this.model}`);
    log.data('API', 'messages', messages.length);
    log.data('API', 'tools', tools.map(t => t.name));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: this.context.systemPrompt,
        messages,
        tools,
        max_tokens: this.maxTokens,
      });

      log.success('API', `Response received: stop_reason=${response.stop_reason}, blocks=${response.content.length}`);
      return {
        type: 'ok',
        content: response.content,
        stopReason: response.stop_reason,
      };
    } catch (err: any) {
      log.error('API', `Request failed: ${err.message}`);
      return { type: 'error', error: err.message || String(err) };
    }
  }

  private async executeTool(
    toolUse: Anthropic.ToolUseBlock,
  ): Promise<Anthropic.ToolResultBlockParam> {
    log.group('TOOL', `executeTool("${toolUse.name}")`);
    log.data('TOOL', 'id', toolUse.id);
    log.data('TOOL', 'input', toolUse.input);

    const tool = this.tools.get(toolUse.name);
    if (!tool) {
      log.error('TOOL', `Unknown tool: "${toolUse.name}"`);
      log.groupEnd();
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
    log.step('TOOL', `Permission check for resource: "${resource}"`);

    for (const perm of tool.definition.permissions || []) {
      const action = this.permissions.check(perm.scope, resource);

      if (action === 'deny') {
        log.error('TOOL', `Permission DENIED by policy (scope=${perm.scope})`);
        log.groupEnd();
        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'Error: Permission denied by policy',
          is_error: true,
        };
      }

      if (action === 'ask' || action === null) {
        log.warn('TOOL', `Permission requires user confirmation (scope=${perm.scope})`);
        const granted = this.onPermissionRequest
          ? await this.onPermissionRequest(toolUse.name, perm.scope, resource)
          : true; // 无 UI 时默认允许

        if (!granted) {
          log.error('TOOL', 'Permission DENIED by user');
          log.groupEnd();
          return {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Error: Permission denied by user',
            is_error: true,
          };
        }
        log.success('TOOL', 'Permission GRANTED by user');
      }
    }

    try {
      log.step('TOOL', `Executing ${toolUse.name}...`);
      const result = await tool.execute(input, this.toolContext);
      if (result.error) {
        log.error('TOOL', `Execution error: ${result.error}`);
      } else {
        log.success('TOOL', `Execution complete (${result.output.length} chars output)`);
      }
      log.groupEnd();
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.error || result.output,
        is_error: !!result.error,
      };
    } catch (err: any) {
      log.error('TOOL', `Execution threw: ${err.message}`);
      log.groupEnd();
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `Tool execution failed: ${err.message}`,
        is_error: true,
      };
    }
  }
}
