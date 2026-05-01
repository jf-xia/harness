/**
 * 日志记录器
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, (text: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

const LOG_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

export class Logger {
  private level: LogLevel;
  private context: string;
  private enableTimestamp: boolean;
  private enableColors: boolean;

  constructor(
    level: LogLevel = 'info',
    context: string = 'App',
    options: { enableTimestamp?: boolean; enableColors?: boolean } = {}
  ) {
    this.level = level;
    this.context = context;
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.enableColors = options.enableColors ?? true;
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const parts: string[] = [];

    // 时间戳
    if (this.enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(this.enableColors ? chalk.gray(timestamp) : timestamp);
    }

    // 日志级别
    const levelStr = `[${level.toUpperCase()}]`;
    const coloredLevel = this.enableColors ? LOG_COLORS[level](levelStr) : levelStr;
    parts.push(coloredLevel);

    // 上下文
    const contextStr = `[${this.context}]`;
    const coloredContext = this.enableColors ? chalk.cyan(contextStr) : contextStr;
    parts.push(coloredContext);

    // 图标
    if (this.enableColors) {
      parts.push(LOG_ICONS[level]);
    }

    // 消息
    parts.push(message);

    // 参数
    if (args.length > 0) {
      const argsStr = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      parts.push(argsStr);
    }

    return parts.join(' ');
  }

  /**
   * 输出日志
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, ...args);
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 设置上下文
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 获取上下文
   */
  getContext(): string {
    return this.context;
  }

  /**
   * 创建子日志器
   */
  child(context: string): Logger {
    return new Logger(this.level, `${this.context}:${context}`, {
      enableTimestamp: this.enableTimestamp,
      enableColors: this.enableColors,
    });
  }

  /**
   * 计时器
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label}: ${duration}ms`);
    };
  }

  /**
   * 异步操作日志
   */
  async logAsync<T>(
    level: LogLevel,
    message: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.log(level, `${message} - started`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.log(level, `${message} - completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `${message} - failed after ${duration}ms: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 表格日志
   */
  table(data: any[], columns?: string[]): void {
    if (!this.shouldLog('info')) {
      return;
    }

    console.table(data, columns);
  }

  /**
   * 分组日志
   */
  group(label: string): void {
    if (!this.shouldLog('info')) {
      return;
    }

    console.group(this.formatMessage('info', label));
  }

  /**
   * 结束分组
   */
  groupEnd(): void {
    if (!this.shouldLog('info')) {
      return;
    }

    console.groupEnd();
  }

  /**
   * 进度条
   */
  progress(current: number, total: number, label?: string): void {
    if (!this.shouldLog('info')) {
      return;
    }

    const percentage = Math.round((current / total) * 100);
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    const message = label 
      ? `${label}: [${bar}] ${percentage}% (${current}/${total})`
      : `[${bar}] ${percentage}% (${current}/${total})`;

    process.stdout.write(`\r${this.formatMessage('info', message)}`);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }
}

/**
 * 创建默认日志器
 */
export function createLogger(
  context: string = 'App',
  level: LogLevel = 'info'
): Logger {
  return new Logger(level, context);
}

/**
 * 全局日志器
 */
export const logger = createLogger('HarnessAgent');