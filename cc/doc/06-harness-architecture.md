# 完整 Harness 架构

## 整体架构

```
┌─────────────────────────────────────────────┐
│                   CLI (Ink)                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Header  │ │ Messages │ │ Input/Prompt │ │
│  └─────────┘ └──────────┘ └──────────────┘ │
├─────────────────────────────────────────────┤
│                Agent Loop                    │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Context  │ │  Tools   │ │ Permission │  │
│  │ Manager  │ │ Registry │ │  Manager   │  │
│  └──────────┘ └──────────┘ └────────────┘  │
├─────────────────────────────────────────────┤
│              Anthropic API                   │
└─────────────────────────────────────────────┘
```

## 主循环

```typescript
// agent/loop.ts
class AgentLoop {
  private context: ContextManager;
  private tools: ToolRegistry;
  private permissions: PermissionManager;
  private client: Anthropic;
  private onEvent: (event: AgentEvent) => void;

  constructor(opts: AgentLoopOptions) {
    this.client = new Anthropic();
    this.context = new ContextManager({
      systemPrompt: opts.systemPrompt,
      maxTokens: 200000,
      reservedTokens: 8192,
    });
    this.tools = new ToolRegistry();
    this.permissions = new PermissionManager(opts.settingsPath);
    this.onEvent = opts.onEvent;

    // 注册内置工具
    this.tools.register(ReadFileTool);
    this.tools.register(BashTool);
    this.tools.register(WriteFileTool);
    this.tools.register(GrepTool);
  }

  async run(userMessage: string): Promise<void> {
    this.context.addMessage({ role: 'user', content: userMessage });
    this.onEvent({ type: 'thinking' });

    let continueLoop = true;

    while (continueLoop) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        system: this.context.systemPrompt,
        messages: this.context.getMessages(),
        tools: this.tools.toAPITools(),
        max_tokens: 4096,
      });

      // 处理响应
      const assistantBlocks: Anthropic.ContentBlock[] = [];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          this.onEvent({ type: 'text', content: block.text });
          assistantBlocks.push(block);
        } else if (block.type === 'tool_use') {
          this.onEvent({ type: 'tool_start', name: block.name, input: block.input });
          assistantBlocks.push(block);

          const result = await this.executeWithPermission(block);
          toolResults.push(result);
          this.onEvent({
            type: 'tool_result',
            name: block.name,
            output: result.content as string,
            isError: result.is_error,
          });
        }
      }

      // 更新上下文
      this.context.addMessage({ role: 'assistant', content: assistantBlocks });

      if (toolResults.length > 0) {
        this.context.addMessage({ role: 'user', content: toolResults });
        continueLoop = true; // 有工具结果，继续循环
      } else {
        continueLoop = false; // 纯文本回复，结束
      }
    }
  }

  private async executeWithPermission(
    toolUse: Anthropic.ToolUseBlock,
  ): Promise<Anthropic.ToolResultBlockParam> {
    const tool = this.tools.get(toolUse.name)!;

    // 权限检查
    for (const perm of tool.definition.permissions || []) {
      const existing = this.permissions.check({
        scope: perm.scope,
        resource: String(toolUse.input.path || toolUse.input.command || ''),
        action: toolUse.name,
      });

      if (existing === 'deny') {
        return { type: 'tool_result', tool_use_id: toolUse.id, content: 'Denied', is_error: true };
      }
      if (existing === 'ask' || existing === null) {
        const granted = await this.permissions.confirm(toolUse.name, {
          scope: perm.scope,
          resource: String(toolUse.input.path || ''),
          action: toolUse.name,
        });
        if (!granted) {
          return { type: 'tool_result', tool_use_id: toolUse.id, content: 'Denied by user', is_error: true };
        }
      }
    }

    return executeToolCall(toolUse, this.tools, this.toolContext);
  }
}
```

## 事件系统

```typescript
type AgentEvent =
  | { type: 'thinking' }
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string; input: Record<string, any> }
  | { type: 'tool_result'; name: string; output: string; isError: boolean }
  | { type: 'error'; error: string }
  | { type: 'done' };
```

## Hook 系统

```typescript
// hooks.ts
interface Hooks {
  beforeTool?: (name: string, input: any) => Promise<void>;
  afterTool?: (name: string, result: ToolResult) => Promise<void>;
  beforeMessage?: (message: Message) => Promise<void>;
  afterResponse?: (response: string) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

class HookManager {
  private hooks: Hooks = {};

  register(hooks: Partial<Hooks>) {
    Object.assign(this.hooks, hooks);
  }

  async run<K extends keyof Hooks>(name: K, ...args: Parameters<NonNullable<Hooks[K]>>) {
    const hook = this.hooks[name];
    if (hook) {
      await (hook as any)(...args);
    }
  }
}
```

## 完整入口

```tsx
// src/index.tsx
import React, { useState, useCallback } from 'react';
import { render, Box, Text, useApp } from 'ink';

function HarnessApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { exit } = useApp();

  const agent = useMemo(() => new AgentLoop({
    systemPrompt: 'You are a helpful coding assistant.',
    settingsPath: '.harness/settings.json',
    onEvent: (event) => {
      if (event.type === 'text') {
        setMessages(prev => [...prev, { role: 'assistant', content: event.content }]);
      }
      if (event.type === 'tool_start') {
        setMessages(prev => [...prev, {
          role: 'tool',
          content: `Running ${event.name}...`,
        }]);
      }
    },
  }), []);

  const handleSubmit = useCallback(async (input: string) => {
    if (input === '/exit') { exit(); return; }
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsProcessing(true);
    await agent.run(input);
    setIsProcessing(false);
  }, [agent]);

  return (
    <Box flexDirection="column" height="100%">
      <Header />
      <MessageList messages={messages} />
      <PromptInput onSubmit={handleSubmit} disabled={isProcessing} />
    </Box>
  );
}

render(<HarnessApp />);
```

## 项目结构

```
src/
├── components/
│   ├── Header.tsx
│   ├── MessageList.tsx
│   ├── Message.tsx
│   ├── PromptInput.tsx
│   └── PermissionDialog.tsx
├── agent/
│   ├── loop.ts           # Agent 主循环
│   ├── context.ts        # 上下文管理
│   └── events.ts         # 事件类型
├── tools/
│   ├── registry.ts       # 工具注册
│   ├── read-file.ts
│   ├── write-file.ts
│   ├── bash.ts
│   └── grep.ts
├── permissions/
│   ├── manager.ts        # 权限管理
│   └── types.ts
├── hooks/
│   └── manager.ts
├── app.tsx               # 根组件
└── index.tsx             # 入口
```

## 下一步
→ 开始编码！从 Phase 1 开始实现。
