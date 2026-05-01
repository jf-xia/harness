import fs from 'node:fs/promises';
import path from 'node:path';
import type { Tool, ToolResult } from '../types.js';
import { log } from '../logger.js';

// Node 22+ has fs.glob, but TypeScript types may not know about it
const fsGlob = (fs as any).glob?.bind(fs);

export const GlobTool: Tool = {
  definition: {
    name: 'glob',
    description: 'Find files matching a glob pattern. Returns matching file paths.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern to match (e.g. "src/**/*.ts")' },
        cwd: { type: 'string', description: 'Directory to search from (defaults to working directory)' },
      },
      required: ['pattern'],
    },
    permissions: [{ scope: 'read' }],
  },

  async execute(input): Promise<ToolResult> {
    const pattern = input.pattern as string;
    const cwd = (input.cwd as string) || process.cwd();

    log.step('GLOB', `Searching: "${pattern}" in ${cwd}`);

    try {
      if (fsGlob) {
        const files: string[] = [];
        for await (const file of fsGlob(pattern, { cwd })) {
          files.push(typeof file === 'string' ? file : file.toString());
        }
        log.success('GLOB', `Found ${files.length} file(s)`);
        return { output: files.length > 0 ? files.join('\n') : '(no matches)' };
      }

      // Fallback: use find command
      log.info('GLOB', 'Using find fallback (fs.glob not available)');
      const { execaCommand } = await import('execa');
      const { stdout } = await execaCommand(`find . -path './${pattern}' -type f`, { cwd });
      log.success('GLOB', 'Find completed');
      return { output: stdout || '(no matches)' };
    } catch (err: any) {
      log.error('GLOB', `Failed: ${err.message}`);
      return { output: '', error: `Glob failed: ${err.message}` };
    }
  },
};
