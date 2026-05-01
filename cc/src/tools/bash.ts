import { execaCommand } from 'execa';
import type { Tool, ToolContext, ToolResult } from '../types.js';

export const BashTool: Tool = {
  definition: {
    name: 'bash',
    description: 'Execute a shell command and return its stdout/stderr output. Use for running scripts, git commands, build tools, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        timeout: { type: 'number', description: 'Timeout in milliseconds (default 30000)' },
      },
      required: ['command'],
    },
    permissions: [{ scope: 'execute' }],
  },

  async execute(input, context: ToolContext): Promise<ToolResult> {
    const command = input.command as string;
    const timeout = (input.timeout as number) || 30000;

    try {
      const result = await execaCommand(command, {
        timeout,
        cwd: context.workingDirectory,
        shell: true,
        reject: false,
      });

      const output = [
        result.stdout,
        result.stderr ? `[stderr]\n${result.stderr}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (result.exitCode !== 0) {
        return { output, error: `Command exited with code ${result.exitCode}` };
      }

      return { output: output || '(no output)' };
    } catch (err: any) {
      if (err.timedOut) {
        return { output: '', error: `Command timed out after ${timeout}ms` };
      }
      return { output: '', error: `Failed to execute command: ${err.message}` };
    }
  },
};
