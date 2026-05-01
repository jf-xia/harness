/**
 * 代理相关类型定义
 */

// 基础代理状态
export interface AgentState {
  id: string;
  name: string;
  status: 'idle' | 'thinking' | 'acting' | 'observing' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  startTime: Date;
  lastUpdateTime: Date;
  metadata: Record<string, any>;
}

// 思考
export interface Thought {
  content: string;
  reasoning: string;
  confidence: number;
  nextAction: string;
  timestamp: Date;
}

// 行动
export interface Action {
  type: string;
  name: string;
  parameters: Record<string, any>;
  description: string;
}

// 观察
export interface Observation {
  success: boolean;
  data: any;
  error?: string;
  timestamp: Date;
  duration: number;
}

// ReAct步骤
export interface ReactStep {
  stepNumber: number;
  thought: Thought;
  action: Action;
  observation: Observation;
  startTime: Date;
  endTime: Date;
}

// ReAct结果
export interface ReactResult {
  success: boolean;
  steps: ReactStep[];
  answer: string;
  totalSteps: number;
  totalTime: number;
  metadata: Record<string, any>;
}

// 代理配置
export interface AgentConfig {
  name: string;
  maxSteps: number;
  timeout: number;
  retryCount: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableTracing: boolean;
}

// 代理接口
export interface IAgent {
  getName(): string;
  getState(): AgentState;
  perceive(environment: Environment): Promise<Perception>;
  reason(perception: Perception): Thought;
  act(thought: Thought): Action;
  observe(action: Action, environment: Environment): Promise<Observation>;
  reset(): void;
}

// 环境接口
export interface Environment {
  getState(): Record<string, any>;
  update(observation: Observation): void;
  getTimeline(): TimelineEvent[];
  addTimelineEvent(event: TimelineEvent): void;
  getChangeEvents(): ChangeEvent[];
  addChangeEvent(event: ChangeEvent): void;
}

// 感知结果
export interface Perception {
  timestamp: Date;
  data: any;
  confidence: number;
}

// 时间线事件
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  content: string;
  importance: number;
  metadata: Record<string, any>;
}

// 变更事件
export interface ChangeEvent {
  id: string;
  timestamp: Date;
  type: 'deployment' | 'code_commit' | 'feature_flag' | 'infrastructure' | 'config_change';
  source: string;
  description: string;
  author: string;
  repository?: string;
  branch?: string;
  commitHash?: string;
  metadata: Record<string, any>;
}

// 代理协调器接口
export interface AgentCoordinator {
  addAgent(agent: IAgent): void;
  removeAgent(agentId: string): void;
  getAgent(agentId: string): IAgent | undefined;
  start(): Promise<void>;
  stop(): Promise<void>;
  getAgents(): IAgent[];
}

// 知识库接口
export interface KnowledgeBase {
  search(query: string): Promise<KnowledgeResult[]>;
  add(entry: KnowledgeEntry): Promise<void>;
  update(id: string, entry: Partial<KnowledgeEntry>): Promise<void>;
  delete(id: string): Promise<void>;
}

// 知识条目
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

// 知识搜索结果
export interface KnowledgeResult {
  entry: KnowledgeEntry;
  relevance: number;
  matchedFields: string[];
}