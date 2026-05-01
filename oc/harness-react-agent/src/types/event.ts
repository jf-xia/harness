/**
 * 事件相关类型定义
 */

// 事件类型
export type EventType = 
  | 'alert'
  | 'incident'
  | 'deployment'
  | 'code_commit'
  | 'feature_flag'
  | 'config_change'
  | 'infrastructure'
  | 'monitoring'
  | 'communication'
  | 'custom';

// 事件优先级
export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

// 事件状态
export type EventStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';

// 基础事件
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  title: string;
  description: string;
  priority: EventPriority;
  status: EventStatus;
  metadata: Record<string, any>;
}

// 告警事件
export interface AlertEvent extends BaseEvent {
  type: 'alert';
  alertSource: string;
  condition: string;
  threshold: number;
  currentValue: number;
  duration: number;
  tags: string[];
}

// 事件事件
export interface IncidentEvent extends BaseEvent {
  type: 'incident';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  rootCause?: string;
  resolution?: string;
  assignee?: string;
  timeline: TimelineEntry[];
  relatedChanges: string[];
}

// 部署事件
export interface DeploymentEvent extends BaseEvent {
  type: 'deployment';
  environment: 'development' | 'staging' | 'production';
  version: string;
  repository: string;
  branch: string;
  commitHash: string;
  author: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  duration?: number;
}

// 代码提交事件
export interface CodeCommitEvent extends BaseEvent {
  type: 'code_commit';
  repository: string;
  branch: string;
  commitHash: string;
  author: string;
  message: string;
  filesChanged: string[];
  additions: number;
  deletions: number;
}

// 功能标志事件
export interface FeatureFlagEvent extends BaseEvent {
  type: 'feature_flag';
  flagName: string;
  action: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled';
  environment: string;
  previousValue?: any;
  newValue?: any;
  author: string;
}

// 时间线条目
export interface TimelineEntry {
  id: string;
  timestamp: Date;
  author: string;
  content: string;
  type: 'note' | 'action' | 'status_change' | 'update';
  metadata: Record<string, any>;
}

// 变更关联
export interface ChangeCorrelation {
  id: string;
  incidentId: string;
  changeEventId: string;
  confidence: number;
  reasoning: string;
  detectedAt: Date;
  validatedAt?: Date;
  validatedBy?: string;
}

// 根因理论
export interface RootCauseTheory {
  id: string;
  incidentId: string;
  theory: string;
  confidence: number;
  evidence: Evidence[];
  reasoning: string;
  status: 'proposed' | 'investigating' | 'confirmed' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// 证据
export interface Evidence {
  id: string;
  type: 'log' | 'metric' | 'trace' | 'change_event' | 'user_input';
  source: string;
  content: string;
  timestamp: Date;
  confidence: number;
  metadata: Record<string, any>;
}

// 告警规则
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  duration: number;
  priority: EventPriority;
  enabled: boolean;
  notificationChannels: string[];
  runbookId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 运维手册
export interface Runbook {
  id: string;
  name: string;
  description: string;
  steps: RunbookStep[];
  triggers: string[];
  tags: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// 运维手册步骤
export interface RunbookStep {
  id: string;
  order: number;
  name: string;
  description: string;
  type: 'manual' | 'automated' | 'approval';
  action: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  timeout?: number;
  retryCount?: number;
}

// 集成配置
export interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  credentials?: Record<string, string>;
  lastSyncAt?: Date;
  status: 'connected' | 'disconnected' | 'error';
}

// 通知配置
export interface NotificationConfig {
  id: string;
  name: string;
  type: 'slack' | 'email' | 'pagerduty' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
  events: EventType[];
}