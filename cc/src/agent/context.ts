import type Anthropic from '@anthropic-ai/sdk';

// 粗略估算 token 数 (1 token ≈ 3-4 chars)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[] | Anthropic.ToolResultBlockParam[];
}

export class ContextManager {
  private messages: ConversationMessage[] = [];
  public readonly systemPrompt: string;
  private readonly maxTokens: number;
  private readonly reservedTokens: number;

  constructor(opts: {
    systemPrompt: string;
    maxTokens: number;
    reservedTokens: number;
  }) {
    this.systemPrompt = opts.systemPrompt;
    this.maxTokens = opts.maxTokens;
    this.reservedTokens = opts.reservedTokens;
  }

  get currentTokens(): number {
    const system = estimateTokens(this.systemPrompt);
    const messages = this.messages.reduce((sum, m) => {
      const text = typeof m.content === 'string'
        ? m.content
        : m.content.map(b => ('text' in b ? b.text : '')).join('');
      return sum + estimateTokens(text) + 4; // role overhead
    }, 0);
    return system + messages;
  }

  get availableTokens(): number {
    return this.maxTokens - this.reservedTokens - this.currentTokens;
  }

  addMessage(msg: ConversationMessage) {
    this.messages.push(msg);
    this.trimIfNeeded();
  }

  getMessages(): Anthropic.MessageParam[] {
    return this.messages.map(m => ({
      role: m.role,
      content: m.content as any,
    }));
  }

  getDisplayMessages(): Array<{ role: string; content: string }> {
    return this.messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : m.content
            .map(b => {
              if ('text' in b) return b.text;
              if ('name' in b) return `[tool_use: ${b.name}]`;
              return '';
            })
            .join(''),
    }));
  }

  get messageCount(): number {
    return this.messages.length;
  }

  private trimIfNeeded() {
    // 保留最近的消息，从最旧的开始移除
    while (this.availableTokens < 0 && this.messages.length > 1) {
      this.messages.shift();
    }
  }

  reset() {
    this.messages = [];
  }
}
