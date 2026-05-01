/**
 * AI Scribe Agent
 * 
 * 负责监控通信渠道，自动记录关键事件和决策，维护事件时间线
 * 模拟Harness AI SRE中的AI Scribe Agent功能
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base-agent';
import {
  Thought,
  Action,
  Observation,
  Environment,
  Perception,
  TimelineEvent,
  AgentConfig,
} from '../types/agent';
import { Logger } from '../utils/logger';

/**
 * 消息接口
 */
export interface Message {
  id: string;
  timestamp: Date;
  author: string;
  content: string;
  channel: string;
  platform: 'slack' | 'teams' | 'zoom' | 'discord' | 'other';
  metadata: Record<string, any>;
}

/**
 * 事件识别结果
 */
export interface EventDetection {
  isEvent: boolean;
  eventType: string;
  importance: number;
  keywords: string[];
  summary: string;
}

/**
 * Scribe Agent配置
 */
export interface ScribeAgentConfig extends AgentConfig {
  channels: string[];
  platforms: string[];
  importanceThreshold: number;
  enableAutoSummary: boolean;
  summaryInterval: number; // 分钟
}

/**
 * AI Scribe Agent类
 */
export class ScribeAgent extends BaseAgent {
  private messages: Message[] = [];
  private timeline: TimelineEvent[] = [];
  private config: ScribeAgentConfig;
  private lastSummaryTime: Date | null = null;
  private eventPatterns: Map<string, RegExp> = new Map();

  constructor(config?: Partial<ScribeAgentConfig>) {
    const defaultConfig: Partial<ScribeAgentConfig> = {
      name: 'AI Scribe Agent',
      maxSteps: 20,
      timeout: 60000,
      channels: ['general', 'incidents', 'deployments'],
      platforms: ['slack', 'teams'],
      importanceThreshold: 0.6,
      enableAutoSummary: true,
      summaryInterval: 15,
    };

    super('AI Scribe Agent', { ...defaultConfig, ...config });
    
    this.config = {
      ...defaultConfig,
      ...config,
    } as ScribeAgentConfig;

    this.initializeEventPatterns();
    this.logger.info('AI Scribe Agent initialized');
  }

  /**
   * 初始化事件模式
   */
  private initializeEventPatterns(): void {
    // 部署相关
    this.eventPatterns.set('deployment', /deploy(ed|ing)?|release[d]?|roll(ed)?\s*out/i);
    
    // 问题相关
    this.eventPatterns.set('incident', /incident|outage|down|broken|error|fail(ed|ure)?/i);
    
    // 决策相关
    this.eventPatterns.set('decision', /decided|decision|agreed|approved|rejected|chose/i);
    
    // 状态变更
    this.eventPatterns.set('status_change', /status|state|changed|updated|modified/i);
    
    // 行动项
    this.eventPatterns.set('action_item', /todo|action|task|need to|should|must/i);
    
    // 紧急事项
    this.eventPatterns.set('urgent', /urgent|critical|asap|immediately|emergency/i);
    
    // 回滚
    this.eventPatterns.set('rollback', /rollback|revert|undo|restore/i);
    
    // 监控告警
    this.eventPatterns.set('alert', /alert|alarm|warning|threshold|breach/i);
  }

  /**
   * 感知环境
   */
  async perceive(environment: Environment): Promise<Perception> {
    this.logger.debug('Perceiving environment...');
    
    // 从环境中获取新消息
    const state = environment.getState();
    const newMessages: Message[] = state.messages || [];
    
    // 过滤出新消息
    const existingIds = new Set(this.messages.map(m => m.id));
    const filteredMessages = newMessages.filter(m => !existingIds.has(m.id));
    
    this.logger.debug(`Found ${filteredMessages.length} new messages`);
    
    return {
      timestamp: new Date(),
      data: {
        messages: filteredMessages,
        currentTimeline: this.timeline,
        channelStats: this.getChannelStats(),
      },
      confidence: 0.9,
    };
  }

  /**
   * 推理
   */
  reason(perception: Perception): Thought {
    this.logger.debug('Reasoning about perception...');
    
    const { messages, currentTimeline } = perception.data;
    
    // 如果没有新消息
    if (!messages || messages.length === 0) {
      return {
        content: 'No new messages to process',
        reasoning: 'No new messages detected in the monitored channels',
        confidence: 0.9,
        nextAction: 'wait',
        timestamp: new Date(),
      };
    }

    // 分析消息
    const events = this.detectEvents(messages);
    const importantEvents = events.filter(e => e.importance >= this.config.importanceThreshold);
    
    this.logger.debug(`Detected ${events.length} events, ${importantEvents.length} important`);

    // 检查是否需要生成摘要
    const shouldSummarize = this.shouldGenerateSummary();

    if (importantEvents.length > 0) {
      // 有重要事件需要记录
      const topEvent = importantEvents[0];
      return {
        content: `Detected important event: ${topEvent.summary}`,
        reasoning: `Found ${importantEvents.length} important events. Top event type: ${topEvent.eventType} with importance: ${topEvent.importance}`,
        confidence: topEvent.importance,
        nextAction: 'record_event',
        timestamp: new Date(),
      };
    } else if (shouldSummarize) {
      // 需要生成摘要
      return {
        content: 'Time to generate a summary',
        reasoning: `Summary interval (${this.config.summaryInterval} minutes) has passed since last summary`,
        confidence: 0.8,
        nextAction: 'generate_summary',
        timestamp: new Date(),
      };
    } else {
      // 没有重要事件
      return {
        content: 'No important events detected',
        reasoning: `Processed ${messages.length} messages, none met importance threshold of ${this.config.importanceThreshold}`,
        confidence: 0.7,
        nextAction: 'wait',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 行动
   */
  act(thought: Thought): Action {
    this.logger.debug(`Acting on thought: ${thought.nextAction}`);
    
    switch (thought.nextAction) {
      case 'record_event':
        return {
          type: 'RECORD_EVENT',
          name: 'record_event',
          parameters: {
            thought: thought.content,
            reasoning: thought.reasoning,
          },
          description: 'Record important event to timeline',
        };
      
      case 'generate_summary':
        return {
          type: 'GENERATE_SUMMARY',
          name: 'generate_summary',
          parameters: {
            timeframe: this.config.summaryInterval,
          },
          description: 'Generate summary of recent events',
        };
      
      case 'wait':
      default:
        return {
          type: 'WAIT',
          name: 'wait',
          parameters: {},
          description: 'Wait for new messages',
        };
    }
  }

  /**
   * 观察行动结果
   */
  async observe(action: Action, environment: Environment): Promise<Observation> {
    this.logger.debug(`Observing action: ${action.type}`);
    
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (action.type) {
        case 'RECORD_EVENT':
          result = await this.recordEvent(environment);
          break;
        
        case 'GENERATE_SUMMARY':
          result = await this.generateSummary(environment);
          break;
        
        case 'WAIT':
          result = { status: 'waiting', message: 'Waiting for new messages' };
          break;
        
        default:
          result = { status: 'unknown_action', action: action.type };
      }
      
      return {
        success: true,
        data: result,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Action failed: ${errorMessage}`);
      
      return {
        success: false,
        data: null,
        error: errorMessage,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 检测事件
   */
  private detectEvents(messages: Message[]): EventDetection[] {
    const events: EventDetection[] = [];
    
    for (const message of messages) {
      const detection = this.analyzeMessage(message);
      if (detection.isEvent) {
        events.push(detection);
      }
    }
    
    // 按重要性排序
    events.sort((a, b) => b.importance - a.importance);
    
    return events;
  }

  /**
   * 分析单条消息
   */
  private analyzeMessage(message: Message): EventDetection {
    const content = message.content.toLowerCase();
    let maxImportance = 0;
    let detectedType = 'general';
    const keywords: string[] = [];
    
    // 检查各种模式
    for (const [eventType, pattern] of this.eventPatterns) {
      if (pattern.test(content)) {
        const importance = this.calculateImportance(eventType, message);
        if (importance > maxImportance) {
          maxImportance = importance;
          detectedType = eventType;
        }
        
        // 提取关键词
        const matches = content.match(pattern);
        if (matches) {
          keywords.push(...matches);
        }
      }
    }
    
    // 基于消息特征调整重要性
    if (message.metadata?.pinned) maxImportance += 0.1;
    if (message.metadata?.reactions?.length > 3) maxImportance += 0.1;
    if (message.content.length > 200) maxImportance += 0.05;
    
    return {
      isEvent: maxImportance > 0.3,
      eventType: detectedType,
      importance: Math.min(maxImportance, 1.0),
      keywords: [...new Set(keywords)],
      summary: this.generateEventSummary(message, detectedType),
    };
  }

  /**
   * 计算事件重要性
   */
  private calculateImportance(eventType: string, message: Message): number {
    const baseImportance: Record<string, number> = {
      'urgent': 0.9,
      'incident': 0.85,
      'rollback': 0.8,
      'deployment': 0.7,
      'alert': 0.75,
      'decision': 0.6,
      'status_change': 0.5,
      'action_item': 0.4,
      'general': 0.2,
    };
    
    let importance = baseImportance[eventType] || 0.2;
    
    // 基于平台调整
    if (message.platform === 'slack') importance += 0.05;
    
    // 基于时间调整（工作时间更重要）
    const hour = message.timestamp.getHours();
    if (hour >= 9 && hour <= 17) importance += 0.05;
    
    return Math.min(importance, 1.0);
  }

  /**
   * 生成事件摘要
   */
  private generateEventSummary(message: Message, eventType: string): string {
    const author = message.author;
    const channel = message.channel;
    const content = message.content.substring(0, 100);
    
    return `[${eventType.toUpperCase()}] ${author} in #${channel}: ${content}...`;
  }

  /**
   * 记录事件到时间线
   */
  private async recordEvent(environment: Environment): Promise<any> {
    const state = environment.getState();
    const messages: Message[] = state.messages || [];
    
    const events = this.detectEvents(messages);
    const importantEvents = events.filter(e => e.importance >= this.config.importanceThreshold);
    
    const recordedEvents: TimelineEvent[] = [];
    
    for (const event of importantEvents) {
      const timelineEvent: TimelineEvent = {
        id: uuidv4(),
        timestamp: new Date(),
        type: event.eventType,
        source: 'scribe_agent',
        content: event.summary,
        importance: event.importance,
        metadata: {
          keywords: event.keywords,
          detectionTime: new Date(),
        },
      };
      
      this.timeline.push(timelineEvent);
      recordedEvents.push(timelineEvent);
      
      this.logger.info(`Recorded event: ${event.summary}`);
    }
    
    // 将新消息添加到已处理列表
    this.messages.push(...messages);
    
    return {
      recordedCount: recordedEvents.length,
      events: recordedEvents,
      totalTimelineEvents: this.timeline.length,
    };
  }

  /**
   * 生成摘要
   */
  private async generateSummary(environment: Environment): Promise<any> {
    const now = new Date();
    const timeframe = this.config.summaryInterval * 60 * 1000; // 转换为毫秒
    
    // 获取时间范围内的事件
    const recentEvents = this.timeline.filter(event => 
      now.getTime() - event.timestamp.getTime() < timeframe
    );
    
    // 按类型分组
    const eventsByType: Record<string, TimelineEvent[]> = {};
    for (const event of recentEvents) {
      if (!eventsByType[event.type]) {
        eventsByType[event.type] = [];
      }
      eventsByType[event.type].push(event);
    }
    
    // 生成摘要文本
    let summary = `## Summary of the last ${this.config.summaryInterval} minutes\n\n`;
    
    for (const [type, events] of Object.entries(eventsByType)) {
      summary += `### ${type.toUpperCase()} (${events.length})\n`;
      for (const event of events.slice(0, 5)) { // 每种类型最多显示5个
        summary += `- ${event.content}\n`;
      }
      if (events.length > 5) {
        summary += `- ... and ${events.length - 5} more\n`;
      }
      summary += '\n';
    }
    
    this.lastSummaryTime = now;
    
    return {
      summary,
      eventCount: recentEvents.length,
      timeframe: this.config.summaryInterval,
      generatedAt: now,
    };
  }

  /**
   * 检查是否应该生成摘要
   */
  private shouldGenerateSummary(): boolean {
    if (!this.config.enableAutoSummary) {
      return false;
    }
    
    if (!this.lastSummaryTime) {
      return true;
    }
    
    const elapsed = Date.now() - this.lastSummaryTime.getTime();
    const interval = this.config.summaryInterval * 60 * 1000;
    
    return elapsed >= interval;
  }

  /**
   * 获取频道统计
   */
  private getChannelStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const message of this.messages) {
      stats[message.channel] = (stats[message.channel] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * 获取时间线
   */
  getTimeline(): TimelineEvent[] {
    return [...this.timeline];
  }

  /**
   * 获取已处理消息
   */
  getProcessedMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * 清除时间线
   */
  clearTimeline(): void {
    this.timeline = [];
    this.logger.info('Timeline cleared');
  }

  /**
   * 克隆代理
   */
  clone(): ScribeAgent {
    return new ScribeAgent(this.config);
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.messages = [];
    this.timeline = [];
    this.eventPatterns.clear();
    super.destroy();
    this.logger.info('Scribe Agent destroyed');
  }
}