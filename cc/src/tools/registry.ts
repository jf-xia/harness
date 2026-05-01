import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '../types.js';
import { log } from '../logger.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    if (this.tools.has(tool.definition.name)) {
      log.error('REGISTRY', `Duplicate tool: "${tool.definition.name}"`);
      throw new Error(`Tool "${tool.definition.name}" already registered`);
    }
    this.tools.set(tool.definition.name, tool);
    log.success('REGISTRY', `Registered tool: ${tool.definition.name}`);
  }

  get(name: string): Tool | undefined {
    const found = this.tools.get(name);
    log.info('REGISTRY', `Lookup "${name}": ${found ? 'found' : 'not found'}`);
    return found;
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  toAPITools(): Anthropic.Tool[] {
    const tools = this.getAll().map(t => ({
      name: t.definition.name,
      description: t.definition.description,
      input_schema: t.definition.inputSchema,
    }));
    log.info('REGISTRY', `Generating API schemas: ${tools.length} tools`);
    return tools;
  }
}
