/**
 * 配置相关类型定义
 */

// 应用配置
export interface AppConfig {
  // 基础配置
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  
  // 代理配置
  agents: {
    defaultMaxSteps: number;
    defaultTimeout: number;
    enableTracing: boolean;
    scribe: AgentModuleConfig;
    rca: AgentModuleConfig;
  };
  
  // Harness配置
  harness: {
    apiUrl: string;
    apiKey?: string;
    accountId?: string;
    orgId?: string;
    projectId?: string;
    timeout: number;
    retryCount: number;
  };
  
  // 集成配置
  integrations: {
    slack?: SlackConfig;
    github?: GitHubConfig;
    datadog?: DatadogConfig;
    pagerduty?: PagerDutyConfig;
    jira?: JiraConfig;
  };
  
  // 存储配置
  storage: {
    type: 'local' | 'redis' | 'database';
    config: Record<string, any>;
  };
  
  // 通知配置
  notifications: {
    enabled: boolean;
    channels: NotificationChannelConfig[];
  };
  
  // 安全配置
  security: {
    encryptionKey?: string;
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireAuth: boolean;
  };
}

// 代理模块配置
export interface AgentModuleConfig {
  enabled: boolean;
  maxSteps: number;
  timeout: number;
  retryCount: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableTracing: boolean;
  customConfig?: Record<string, any>;
}

// Slack配置
export interface SlackConfig {
  botToken?: string;
  appToken?: string;
  signingSecret?: string;
  channels: string[];
  mentionBot: boolean;
  threadSupport: boolean;
}

// GitHub配置
export interface GitHubConfig {
  token?: string;
  owner?: string;
  repo?: string;
  webhookSecret?: string;
  events: string[];
}

// Datadog配置
export interface DatadogConfig {
  apiKey?: string;
  appKey?: string;
  site: string;
  tags: string[];
}

// PagerDuty配置
export interface PagerDutyConfig {
  apiToken?: string;
  serviceId?: string;
  escalationPolicyId?: string;
}

// Jira配置
export interface JiraConfig {
  host?: string;
  email?: string;
  apiToken?: string;
  projectKey?: string;
}

// 通知渠道配置
export interface NotificationChannelConfig {
  id: string;
  name: string;
  type: 'slack' | 'email' | 'pagerduty' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
  events: string[];
}

// CLI配置
export interface CLIConfig {
  // 命令配置
  commands: {
    defaultCommand: string;
    aliasSupport: boolean;
    historySize: number;
  };
  
  // 交互配置
  interactive: {
    prompt: string;
    autoComplete: boolean;
    history: boolean;
    vim: boolean;
  };
  
  // 输出配置
  output: {
    format: 'text' | 'json' | 'yaml';
    colors: boolean;
    verbose: boolean;
    quiet: boolean;
  };
  
  // 主题配置
  theme: {
    primaryColor: string;
    secondaryColor: string;
    successColor: string;
    errorColor: string;
    warningColor: string;
  };
}

// 配置验证错误
export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
  expected?: string;
}

// 配置加载选项
export interface ConfigLoadOptions {
  configPath?: string;
  environment?: string;
  defaults?: Partial<AppConfig>;
  validate?: boolean;
  watch?: boolean;
}

// 配置更新事件
export interface ConfigUpdateEvent {
  timestamp: Date;
  path: string;
  oldValue: any;
  newValue: any;
  source: 'user' | 'environment' | 'file' | 'remote';
}

// 配置导出格式
export type ConfigExportFormat = 'json' | 'yaml' | 'toml' | 'env';

// 配置导入选项
export interface ConfigImportOptions {
  format: ConfigExportFormat;
  source: string;
  merge?: boolean;
  validate?: boolean;
}

// 配置导出选项
export interface ConfigExportOptions {
  format: ConfigExportFormat;
  destination?: string;
  includeSecrets?: boolean;
  pretty?: boolean;
}