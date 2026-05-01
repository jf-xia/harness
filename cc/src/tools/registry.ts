import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '../types.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool "${tool.definition.name}" already registered`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  toAPITools(): Anthropic.Tool[] {
    return this.getAll().map(t => ({
      name: t.definition.name,
      description: t.definition.description,
      input_schema: t.definition.inputSchema,
    }));
  }
}
