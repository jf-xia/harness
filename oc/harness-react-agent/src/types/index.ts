/**
 * 类型定义索引
 */

// 导出所有类型
export * from './agent';
export * from './event';
export * from './config';

// 重新导出常用类型
export type {
  // 代理类型
  AgentState,
  Thought,
  Action,
  Observation,
  ReactStep,
  ReactResult,
  AgentConfig,
  IAgent,
  Environment,
  Perception,
  TimelineEvent,
  ChangeEvent,
  AgentCoordinator,
  KnowledgeBase,
  KnowledgeEntry,
  KnowledgeResult,
} from './agent';

export type {
  // 事件类型
  EventType,
  EventPriority,
  EventStatus,
  BaseEvent,
  AlertEvent,
  IncidentEvent,
  DeploymentEvent,
  CodeCommitEvent,
  FeatureFlagEvent,
  TimelineEntry,
  ChangeCorrelation,
  RootCauseTheory,
  Evidence,
  AlertRule,
  Runbook,
  RunbookStep,
  IntegrationConfig,
  NotificationConfig,
} from './event';

export type {
  // 配置类型
  AppConfig,
  AgentModuleConfig,
  SlackConfig,
  GitHubConfig,
  DatadogConfig,
  PagerDutyConfig,
  JiraConfig,
  NotificationChannelConfig,
  CLIConfig,
  ConfigValidationError,
  ConfigLoadOptions,
  ConfigUpdateEvent,
  ConfigExportFormat,
  ConfigImportOptions,
  ConfigExportOptions,
} from './config';

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// 函数类型
export type AsyncFunction<T = void> = () => Promise<T>;
export type Callback<T = void> = (error: Error | null, result?: T) => void;
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

// 状态类型
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// 分页类型
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 过滤类型
export interface FilterParams {
  search?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}

// 时间范围
export interface TimeRange {
  start: Date;
  end: Date;
  label?: string;
}

// 统计数据
export interface Statistics {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}