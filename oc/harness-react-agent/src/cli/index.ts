#!/usr/bin/env node

/**
 * Harness Agent CLI入口
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createLogger } from '../utils/logger';
import { startCommand } from './commands/start';
import { analyzeCommand } from './commands/analyze';
import { reportCommand } from './commands/report';
import { configCommand } from './commands/config';

const logger = createLogger('CLI', 'info');

const program = new Command();

// 设置CLI基本信息
program
  .name('harness-agent')
  .description(chalk.blue('Harness AI SRE ReAct Agent CLI'))
  .version('1.0.0', '-v, --version', 'Display version number')
  .option('-d, --debug', 'Enable debug mode', false)
  .option('-q, --quiet', 'Suppress output', false)
  .option('--log-level <level>', 'Set log level', 'info');

// 添加命令
program.addCommand(startCommand);
program.addCommand(analyzeCommand);
program.addCommand(reportCommand);
program.addCommand(configCommand);

// 处理全局选项
program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  
  if (options.debug) {
    process.env.LOG_LEVEL = 'debug';
  }
  
  if (options.quiet) {
    process.env.LOG_LEVEL = 'error';
  }
  
  if (options.logLevel) {
    process.env.LOG_LEVEL = options.logLevel;
  }
});

// 显示欢迎信息
program.hook('preAction', () => {
  console.log(chalk.blue.bold('\n🤖 Harness AI SRE Agent'));
  console.log(chalk.gray('Powered by ReAct Architecture\n'));
});

// 处理未知命令
program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('Use --help to see available commands'));
  process.exit(1);
});

// 添加帮助信息
program.addHelpText('after', `
${chalk.blue('Examples:')}
  $ harness-agent start --agents scribe,rca
  $ harness-agent analyze --incident INC-123
  $ harness-agent report --format json
  $ harness-agent config show

${chalk.blue('For more information, visit:')}
  ${chalk.underline('https://developer.harness.io/docs/ai-sre')}
`);

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error.message);
  if (process.env.LOG_LEVEL === 'debug') {
    console.error(error);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

// 解析命令行参数
program.parse();