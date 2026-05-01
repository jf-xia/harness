# 上下文管理

## 问题

LLM 有上下文窗口限制（如 Claude 200K tokens）。对话越来越长时，需要：
1. 追踪已用 token 数
2. 在接近上限时压缩/截断
3. 保留关键信息（系统提示、最近消息）

## 上下文结构

```
┌──────────────────────────────┐
│  System Prompt               │  ← 始终保留
│  (tools description, rules)  │
├──────────────────────────────┤
│  Conversation History        │  ← 可压缩区域
│  [user] message 1            │
│  [assistant] response 1      │
│  [tool] result 1             │
│  ...                         │
│  [user] message N            │
├──────────────────────────────┤
│  Current Turn                │  ← 始终保留
│  [user] latest message       │
└──────────────────────────────┘
```

## Token 计算

```typescript
// 简化版 token 估算（实际应使用 tiktoken）
function estimateTokens(text: string): number {
  // 粗略估算: 1 token ≈ 4 characters for English, ~2 for CJK
  return Math.ceil(text.length / 3);
}

function estimateMessageTokens(msg: Message): number {
  const roleOverhead = 4; // role + formatting
  return roleOverhead + estimateTokens(msg.content);
}
```

## 上下文管理器

```typescript
class ContextManager {
  private messages: Message[] = [];
  private systemPrompt: string;
  private maxTokens: number;
  private reservedTokens: number; // 为回复预留的空间

  constructor(opts: {
    systemPrompt: string;
    maxTokens: number;      // 如 200000
    reservedTokens: number;  // 如 4096
  }) {
    this.systemPrompt = opts.systemPrompt;
    this.maxTokens = opts.maxTokens;
    this.reservedTokens = opts.reservedTokens;
  }

  get availableTokens(): number {
    return this.maxTokens - this.reservedTokens - this.currentTokens;
  }

  get currentTokens(): number {
    const system = estimateTokens(this.systemPrompt);
    const messages = this.messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
    return system + messages;
  }

  addMessage(msg: Message) {
    this.messages.push(msg);
    this.trimIfNeeded();
  }

  private trimIfNeeded() {
    while (this.availableTokens < 0 && this.messages.length > 1) {
      // 策略: 从最旧的消息开始移除
      // 更好的策略: 保留最近 N 条，压缩中间的
      this.messages.shift();
    }
  }

  getMessages(): Anthropic.MessageParam[] {
    return this.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }
}
```

## 压缩策略

### 策略 1: 滑动窗口
保留最近 N 条消息，丢弃更早的。

```
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  ↓ 保留最近 5 条
[6, 7, 8, 9, 10]
```

简单但丢失历史信息。

### 策略 2: 摘要压缩
将旧消息压缩为摘要，保留上下文。

```typescript
async function compressMessages(
  messages: Message[],
  client: Anthropic,
): Promise<Message[]> {
  if (messages.length <= 10) return messages;

  const old = messages.slice(0, -5);
  const recent = messages.slice(-5);

  const summary = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    messages: [{
      role: 'user',
      content: `Summarize this conversation concisely:\n${
        old.map(m => `[${m.role}]: ${m.content}`).join('\n')
      }`,
    }],
    max_tokens: 500,
  });

  const summaryText = summary.content[0].type === 'text'
    ? summary.content[0].text
    : '';

  return [
    { role: 'system', content: `[Previous conversation summary]: ${summaryText}` },
    ...recent,
  ];
}
```

### 策略 3: 分层保留
```
优先级 1: 系统提示 + 工具定义     → 永不丢弃
优先级 2: 最近 3 轮对话           → 永不丢弃
优先级 3: 中间对话的摘要          → 可压缩
优先级 4: 早期对话               → 可丢弃
```

## 与 API 集成

```typescript
class HarnessAgent {
  private context: ContextManager;
  private client: Anthropic;

  async chat(userMessage: string): Promise<string> {
    this.context.addMessage({ role: 'user', content: userMessage });

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: this.context.systemPrompt,
      messages: this.context.getMessages(),
      tools: this.registry.toAPITools(),
      max_tokens: 4096,
    });

    // 处理工具调用
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeToolCall(block, this.registry, this.toolContext);
        this.context.addMessage({ role: 'assistant', content: [block] });
        this.context.addMessage({ role: 'user', content: [result] });
        // 递归继续对话
        return this.chat(''); // 继续处理
      }
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    this.context.addMessage({ role: 'assistant', content: text });
    return text;
  }
}
```

## 下一步
→ 权限系统 (05-permissions.md)
