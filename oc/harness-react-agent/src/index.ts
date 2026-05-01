/**
 * Harness Agent - 主入口文件
 * 
 * 导出所有公共API
 */

// 核心模块
export { ReactEngine, createReactEngine } from './core/react-engine';
export type { ReactEngineConfig, ExecutionMetrics } from './core/react-engine';

// 代理模块
export { BaseAgent } from './agents/base-agent';
export { ScribeAgent } from './agents/scribe-agent';
export { RCAChangeAgent } from './agents/rca-agent';
export type { ScribeAgentConfig, Message, EventDetection } from './agents/scribe-agent';
export type { RCAAgentConfig, RootCauseTheory, Evidence, ChangeCorrelation } from './agents/rca-agent';

// 类型定义
export * from './types';

// 工具模块
export { Logger, createLogger, logger } from './utils/logger';
export type { LogLevel } from './utils/logger';

// 版本信息
export const VERSION = '1.0.0';
export const NAME = 'harness-agent';

/**
 * 创建默认配置
 */
export function createDefaultConfig() {
  return {
    app: {
      name: NAME,
      version: VERSION,
      environment: 'development' as const,
      debug: false,
      logLevel: 'info' as const,
    },
    agents: {
      defaultMaxSteps: 10,
      defaultTimeout: 60000,
      enableTracing: true,
      scribe: {
        enabled: true,
        maxSteps: 20,
        timeout: 60000,
        retryCount: 3,
        logLevel: 'info' as const,
        enableTracing: true,
      },
      rca: {
        enabled: true,
        maxSteps: 15,
        timeout: 45000,
        retryCount: 3,
        logLevel: 'info' as const,
        enableTracing: true,
      },
    },
    harness: {
      apiUrl: 'https://app.harness.io',
      timeout: 30000,
      retryCount: 3,
    },
  };
}

/**
 * 快速启动函数
 */
export async function quickStart(options?: {
  agents?: string[];
  mock?: boolean;
  logLevel?: string;
}) {
  const { ScribeAgent } = await import('./agents/scribe-agent');
  const { RCAChangeAgent } = await import('./agents/rca-agent');
  const { ReactEngine } = await import('./core/react-engine');
  
  const agents = [];
  const agentNames = options?.agents || ['scribe', 'rca'];
  
  if (agentNames.includes('scribe')) {
    agents.push(new ScribeAgent());
  }
  
  if (agentNames.includes('rca')) {
    agents.push(new RCAChangeAgent());
  }
  
  const engine = new ReactEngine({
    logLevel: (options?.logLevel as any) || 'info',
  });
  
  return { agents, engine };
}