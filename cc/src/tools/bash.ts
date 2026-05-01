import { execaCommand } from 'execa';
import type { Tool, ToolContext, ToolResult } from '../types.js';
import { log } from '../logger.js';

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

    log.step('BASH', `Executing: "${command}"`, { timeout, cwd: context.workingDirectory });

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

      // exitCode 为 undefined 说明进程被信号终止
      if (result.exitCode === undefined) {
        const sig = result.signal || 'unknown';
        log.warn('BASH', `Process killed by signal: ${sig}`);
        return { output, error: `Process killed by signal ${sig}` };
      }

      if (result.exitCode !== 0) {
        // 非零退出码不一定是错误（如 which 找不到程序），保留输出让 Agent 自行判断
        log.warn('BASH', `Exit code ${result.exitCode}`);
        return { output: output || `(exit code ${result.exitCode})` };
      }

      log.success('BASH', `Command succeeded (${output.length} chars output)`);
      return { output: output || '(no output)' };
    } catch (err: any) {
      if (err.timedOut) {
        log.error('BASH', `Command timed out after ${timeout}ms`);
        return { output: '', error: `Command timed out after ${timeout}ms` };
      }
      log.error('BASH', `Execution failed: ${err.message}`);
      return { output: '', error: `Failed to execute command: ${err.message}` };
    }
  },
};
