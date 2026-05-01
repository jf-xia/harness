import fs from 'node:fs/promises';
import path from 'node:path';
import type { Tool, ToolResult } from '../types.js';

export const WriteFileTool: Tool = {
  definition: {
    name: 'write_file',
    description: 'Write content to a file at the given absolute path. Creates parent directories if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to write' },
        content: { type: 'string', description: 'The content to write to the file' },
      },
      required: ['path', 'content'],
    },
    permissions: [{ scope: 'write' }],
  },

  async execute(input): Promise<ToolResult> {
    const filePath = input.path as string;
    const content = input.content as string;

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return { output: `Successfully wrote ${content.length} characters to ${filePath}` };
    } catch (err: any) {
      return { output: '', error: `Failed to write file: ${err.message}` };
    }
  },
};
