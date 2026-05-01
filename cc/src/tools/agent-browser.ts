import { execaCommand } from 'execa';
import type { Tool, ToolContext, ToolResult } from '../types.js';
import { log } from '../logger.js';

const ENGINE = 'chrome';
const TIMEOUT = 30000;

export const AgentBrowserTool: Tool = {
  definition: {
    name: 'agent_browser',
    description: `Browser automation tool powered by agent-browser with Lightpanda engine. Use for web browsing, extracting page content, and interacting with web pages.

Common workflows:
1. Get page content: open(url) → snapshot → text(@eN)
2. Search: open(search_engine) → type(@eN, query) → click(@eN) → snapshot → text(@eN)
3. Interact: snapshot → click/type/fill(@eN)

Use @eN element references from snapshot output for targeting elements.`,
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The agent-browser subcommand to run. Supported: open, snapshot, click, type, fill, text, screenshot, wait, scroll, get, press, back, forward, reload, close',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Arguments for the command. E.g. for "open": ["https://example.com"], for "click": ["@e2"]',
        },
        options: {
          type: 'object',
          description: 'Additional CLI flags. E.g. {"full": true} for screenshot, {"interactive": true} for snapshot',
        },
      },
      required: ['command'],
    },
    permissions: [{ scope: 'network' }],
  },

  async execute(input, context: ToolContext): Promise<ToolResult> {
    const command = input.command as string;
    const args = (input.args as string[]) || [];
    const options = (input.options as Record<string, string | boolean>) || {};

    const allowedCommands = [
      'open', 'snapshot', 'click', 'type', 'fill', 'text', 'screenshot',
      'wait', 'scroll', 'get', 'press', 'back', 'forward', 'reload', 'close',
      'dblclick', 'hover', 'focus', 'select', 'eval', 'find', 'is',
    ];

    if (!allowedCommands.includes(command)) {
      log.error('BROWSER', `Disallowed command: ${command}`);
      return {
        output: '',
        error: `Command "${command}" is not allowed. Allowed: ${allowedCommands.join(', ')}`,
      };
    }

    // 构建命令
    const parts = [
      'agent-browser',
      `--engine ${ENGINE}`,
      command,
      ...args.map(a => `"${a}"`),
    ];

    // 添加选项标志
    for (const [key, val] of Object.entries(options)) {
      if (val === true) {
        parts.push(`--${key}`);
      } else if (val === false) {
        parts.push(`--${key} false`);
      } else if (typeof val === 'string') {
        parts.push(`--${key} "${val}"`);
      }
    }

    const fullCommand = parts.join(' ');
    log.step('BROWSER', `Executing: ${fullCommand}`);

    try {
      const result = await execaCommand(fullCommand, {
        timeout: TIMEOUT,
        cwd: context.workingDirectory,
        shell: true,
        reject: false,
        env: {
          ...process.env,
          AGENT_BROWSER_ENGINE: ENGINE,
        },
      });

      const output = [
        result.stdout,
        result.stderr ? `[stderr]\n${result.stderr}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (result.exitCode === undefined) {
        log.warn('BROWSER', `Process killed by signal: ${result.signal}`);
        return { output, error: `Process killed by signal ${result.signal}` };
      }

      if (result.exitCode !== 0) {
        log.warn('BROWSER', `Exit code ${result.exitCode}`);
        return { output: output || `(exit code ${result.exitCode})` };
      }

      log.success('BROWSER', `Done (${output.length} chars)`);
      return { output: output || '(no output)' };
    } catch (err: any) {
      if (err.timedOut) {
        log.error('BROWSER', `Timed out after ${TIMEOUT}ms`);
        return { output: '', error: `Command timed out after ${TIMEOUT}ms` };
      }
      log.error('BROWSER', `Failed: ${err.message}`);
      return { output: '', error: `Failed: ${err.message}` };
    }
  },
};
