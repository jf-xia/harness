import fs from 'node:fs/promises';
import type { Tool, ToolContext, ToolResult } from '../types.js';
import { log } from '../logger.js';

export const ReadFileTool: Tool = {
  definition: {
    name: 'read_file',
    description: 'Read the contents of a file at the given absolute path. Supports optional offset and limit for reading specific line ranges.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to read' },
        offset: { type: 'number', description: 'Line number to start reading from (0-based)' },
        limit: { type: 'number', description: 'Maximum number of lines to read' },
      },
      required: ['path'],
    },
    permissions: [{ scope: 'read' }],
  },

  async execute(input): Promise<ToolResult> {
    const path = input.path as string;
    const offset = (input.offset as number) || 0;
    const limit = input.limit as number | undefined;

    log.step('READ_FILE', `Reading: ${path}`, { offset, limit });

    try {
      const content = await fs.readFile(path, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, offset);
      const end = limit ? start + limit : lines.length;
      const selected = lines.slice(start, end);

      const numbered = selected.map((line, i) => `${start + i + 1}\t${line}`).join('\n');
      log.success('READ_FILE', `Read ${selected.length} lines (total ${lines.length})`);
      return { output: numbered };
    } catch (err: any) {
      log.error('READ_FILE', `Failed: ${err.message}`);
      return { output: '', error: `Failed to read file: ${err.message}` };
    }
  },
};
