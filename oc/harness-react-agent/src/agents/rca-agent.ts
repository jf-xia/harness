/**
 * RCA Change Agent
 * 
 * 负责分析事件时间线，关联变更事件，生成根因分析理论
 * 模拟Harness AI SRE中的RCA Change Agent功能
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
  ChangeEvent,
  AgentConfig,
} from '../types/agent';
import { Logger } from '../utils/logger';

/**
 * 根因理论
 */
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

/**
 * 证据
 */
export interface Evidence {
  id: string;
  type: 'timeline_event' | 'change_event' | 'metric' | 'log' | 'pattern';
  source: string;
  content: string;
  timestamp: Date;
  relevance: number;
  metadata: Record<string, any>;
}

/**
 * 变更关联
 */
export interface ChangeCorrelation {
  id: string;
  timelineEventId: string;
  changeEventId: string;
  correlationScore: number;
  timeDifference: number; // 毫秒
  reasoning: string;
}

/**
 * RCA Agent配置
 */
export interface RCAAgentConfig extends AgentConfig {
  correlationWindow: number; // 分钟
  minConfidence: number;
  maxTheories: number;
  enablePatternAnalysis: boolean;
  enableMetricCorrelation: boolean;
}

/**
 * RCA Change Agent类
 */
export class RCAChangeAgent extends BaseAgent {
  private theories: RootCauseTheory[] = [];
  private correlations: ChangeCorrelation[] = [];
  private evidence: Evidence[] = [];
  private config: RCAAgentConfig;

  constructor(config?: Partial<RCAAgentConfig>) {
    const defaultConfig: Partial<RCAAgentConfig> = {
      name: 'RCA Change Agent',
      maxSteps: 15,
      timeout: 45000,
      correlationWindow: 30, // 30分钟
      minConfidence: 0.5,
      maxTheories: 5,
      enablePatternAnalysis: true,
      enableMetricCorrelation: true,
    };

    super('RCA Change Agent', { ...defaultConfig, ...config });
    
    this.config = {
      ...defaultConfig,
      ...config,
    } as RCAAgentConfig;

    this.logger.info('RCA Change Agent initialized');
  }

  /**
   * 感知环境
   */
  async perceive(environment: Environment): Promise<Perception> {
    this.logger.debug('Perceiving environment for RCA...');
    
    const state = environment.getState();
    const timeline: TimelineEvent[] = state.timeline || [];
    const changeEvents: ChangeEvent[] = state.changeEvents || [];
    
    // 获取最近的时间线事件
    const recentTimeline = this.getRecentEvents(timeline, this.config.correlationWindow);
    
    // 获取最近的变更事件
    const recentChanges = this.getRecentEvents(changeEvents, this.config.correlationWindow);
    
    this.logger.debug(`Found ${recentTimeline.length} timeline events and ${recentChanges.length} change events`);

    return {
      timestamp: new Date(),
      data: {
        timeline: recentTimeline,
        changeEvents: recentChanges,
        allTimeline: timeline,
        allChangeEvents: changeEvents,
        existingTheories: this.theories,
      },
      confidence: 0.9,
    };
  }

  /**
   * 推理
   */
  reason(perception: Perception): Thought {
    this.logger.debug('Reasoning about RCA...');
    
    const { timeline, changeEvents, existingTheories } = perception.data;
    
    // 如果没有时间线事件，等待
    if (!timeline || timeline.length === 0) {
      return {
        content: 'No timeline events to analyze',
        reasoning: 'No recent timeline events found for analysis',
        confidence: 0.9,
        nextAction: 'wait',
        timestamp: new Date(),
      };
    }

    // 检查是否有未解决的事件需要分析
    const unresolvedEvents = timeline.filter((event: TimelineEvent) => 
      event.type === 'incident' || event.importance > 0.7
    );

    if (unresolvedEvents.length === 0) {
      return {
        content: 'No unresolved events to analyze',
        reasoning: 'All recent events have been analyzed or resolved',
        confidence: 0.8,
        nextAction: 'wait',
        timestamp: new Date(),
      };
    }

    // 分析变更关联
    const correlations = this.findCorrelations(timeline, changeEvents);
    
    if (correlations.length > 0) {
      // 有相关变更
      const topCorrelation = correlations[0];
      return {
        content: `Found correlation between event and change: ${topCorrelation.reasoning}`,
        reasoning: `Detected ${correlations.length} correlations. Top correlation score: ${topCorrelation.correlationScore}`,
        confidence: topCorrelation.correlationScore,
        nextAction: 'analyze_correlation',
        timestamp: new Date(),
      };
    } else if (this.config.enablePatternAnalysis) {
      // 没有直接关联，尝试模式分析
      return {
        content: 'No direct correlations found, performing pattern analysis',
        reasoning: 'Attempting to identify patterns in timeline events',
        confidence: 0.6,
        nextAction: 'analyze_patterns',
        timestamp: new Date(),
      };
    } else {
      return {
        content: 'No correlations or patterns found',
        reasoning: 'Unable to identify root cause with current data',
        confidence: 0.3,
        nextAction: 'generate_report',
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
      case 'analyze_correlation':
        return {
          type: 'ANALYZE_CORRELATION',
          name: 'analyze_correlation',
          parameters: {
            reasoning: thought.reasoning,
          },
          description: 'Analyze correlation between events and changes',
        };
      
      case 'analyze_patterns':
        return {
          type: 'ANALYZE_PATTERNS',
          name: 'analyze_patterns',
          parameters: {},
          description: 'Analyze patterns in timeline events',
        };
      
      case 'generate_report':
        return {
          type: 'GENERATE_REPORT',
          name: 'generate_report',
          parameters: {},
          description: 'Generate RCA report',
        };
      
      case 'wait':
      default:
        return {
          type: 'WAIT',
          name: 'wait',
          parameters: {},
          description: 'Wait for new events to analyze',
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
        case 'ANALYZE_CORRELATION':
          result = await this.analyzeCorrelation(environment);
          break;
        
        case 'ANALYZE_PATTERNS':
          result = await this.analyzePatterns(environment);
          break;
        
        case 'GENERATE_REPORT':
          result = await this.generateReport(environment);
          break;
        
        case 'WAIT':
          result = { status: 'waiting', message: 'Waiting for new events' };
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
   * 获取最近的事件
   */
  private getRecentEvents<T extends { timestamp: Date }>(
    events: T[],
    windowMinutes: number
  ): T[] {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    return events.filter(event => {
      const eventTime = event.timestamp instanceof Date 
        ? event.timestamp.getTime() 
        : new Date(event.timestamp).getTime();
      return now - eventTime <= windowMs;
    });
  }

  /**
   * 查找变更关联
   */
  private findCorrelations(
    timeline: TimelineEvent[],
    changeEvents: ChangeEvent[]
  ): ChangeCorrelation[] {
    const correlations: ChangeCorrelation[] = [];
    
    for (const event of timeline) {
      for (const change of changeEvents) {
        const timeDiff = Math.abs(event.timestamp.getTime() - change.timestamp.getTime());
        const windowMs = this.config.correlationWindow * 60 * 1000;
        
        // 检查是否在时间窗口内
        if (timeDiff <= windowMs) {
          const correlation = this.calculateCorrelation(event, change, timeDiff);
          
          if (correlation.correlationScore >= this.config.minConfidence) {
            correlations.push(correlation);
          }
        }
      }
    }
    
    // 按关联分数排序
    correlations.sort((a, b) => b.correlationScore - a.correlationScore);
    
    return correlations;
  }

  /**
   * 计算关联分数
   */
  private calculateCorrelation(
    event: TimelineEvent,
    change: ChangeEvent,
    timeDifference: number
  ): ChangeCorrelation {
    let score = 0;
    let reasoning = '';
    
    // 基于时间差计算分数（越近越高）
    const windowMs = this.config.correlationWindow * 60 * 1000;
    const timeScore = 1 - (timeDifference / windowMs);
    score += timeScore * 0.4;
    
    // 基于事件类型匹配
    const typeMatch = this.checkTypeMatch(event.type, change.type);
    if (typeMatch) {
      score += 0.3;
      reasoning += `Event type "${event.type}" matches change type "${change.type}". `;
    }
    
    // 基于内容相关性
    const contentRelevance = this.checkContentRelevance(event.content, change.description);
    score += contentRelevance * 0.3;
    
    if (contentRelevance > 0.5) {
      reasoning += `Content relevance: ${Math.round(contentRelevance * 100)}%. `;
    }
    
    // 基于重要性
    score += event.importance * 0.1;
    
    if (!reasoning) {
      reasoning = `Time-based correlation: ${Math.round(timeScore * 100)}%`;
    }
    
    return {
      id: uuidv4(),
      timelineEventId: event.id,
      changeEventId: change.id,
      correlationScore: Math.min(score, 1.0),
      timeDifference,
      reasoning: reasoning.trim(),
    };
  }

  /**
   * 检查类型匹配
   */
  private checkTypeMatch(eventType: string, changeType: string): boolean {
    const typeMappings: Record<string, string[]> = {
      'incident': ['deployment', 'config_change', 'infrastructure'],
      'alert': ['deployment', 'config_change', 'feature_flag'],
      'deployment': ['deployment', 'code_commit'],
      'status_change': ['deployment', 'config_change', 'infrastructure'],
    };
    
    const expectedTypes = typeMappings[eventType] || [];
    return expectedTypes.includes(changeType);
  }

  /**
   * 检查内容相关性
   */
  private checkContentRelevance(eventContent: string, changeDescription: string): number {
    // 简单的关键词匹配
    const eventWords = new Set(eventContent.toLowerCase().split(/\s+/));
    const changeWords = new Set(changeDescription.toLowerCase().split(/\s+/));
    
    let matches = 0;
    for (const word of eventWords) {
      if (changeWords.has(word) && word.length > 3) {
        matches++;
      }
    }
    
    const totalWords = Math.max(eventWords.size, changeWords.size);
    return totalWords > 0 ? matches / totalWords : 0;
  }

  /**
   * 分析关联
   */
  private async analyzeCorrelation(environment: Environment): Promise<any> {
    const state = environment.getState();
    const timeline: TimelineEvent[] = state.timeline || [];
    const changeEvents: ChangeEvent[] = state.changeEvents || [];
    
    const correlations = this.findCorrelations(timeline, changeEvents);
    this.correlations.push(...correlations);
    
    // 基于关联生成理论
    for (const correlation of correlations) {
      const timelineEvent = timeline.find(e => e.id === correlation.timelineEventId);
      const changeEvent = changeEvents.find(e => e.id === correlation.changeEventId);
      
      if (timelineEvent && changeEvent) {
        const theory = this.generateTheory(timelineEvent, changeEvent, correlation);
        this.theories.push(theory);
        
        // 添加证据
        const evidence: Evidence = {
          id: uuidv4(),
          type: 'timeline_event',
          source: 'timeline',
          content: timelineEvent.content,
          timestamp: timelineEvent.timestamp,
          relevance: correlation.correlationScore,
          metadata: { correlationId: correlation.id },
        };
        
        this.evidence.push(evidence);
      }
    }
    
    // 限制理论数量
    if (this.theories.length > this.config.maxTheories) {
      this.theories.sort((a, b) => b.confidence - a.confidence);
      this.theories = this.theories.slice(0, this.config.maxTheories);
    }
    
    return {
      correlationsFound: correlations.length,
      theoriesGenerated: this.theories.length,
      topTheory: this.theories[0] || null,
      correlations,
    };
  }

  /**
   * 生成理论
   */
  private generateTheory(
    event: TimelineEvent,
    change: ChangeEvent,
    correlation: ChangeCorrelation
  ): RootCauseTheory {
    const theory = `The ${event.type} event "${event.content}" may have been caused by the ${change.type} change "${change.description}" made by ${change.author}`;
    
    return {
      id: uuidv4(),
      incidentId: event.id,
      theory,
      confidence: correlation.correlationScore,
      evidence: [],
      reasoning: correlation.reasoning,
      status: 'proposed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 分析模式
   */
  private async analyzePatterns(environment: Environment): Promise<any> {
    const state = environment.getState();
    const timeline: TimelineEvent[] = state.timeline || [];
    
    const patterns = this.identifyPatterns(timeline);
    
    // 基于模式生成理论
    for (const pattern of patterns) {
      const theory: RootCauseTheory = {
        id: uuidv4(),
        incidentId: 'pattern_analysis',
        theory: pattern.description,
        confidence: pattern.confidence,
        evidence: pattern.evidence,
        reasoning: `Pattern detected: ${pattern.type}`,
        status: 'proposed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.theories.push(theory);
    }
    
    return {
      patternsFound: patterns.length,
      theoriesGenerated: this.theories.length,
      patterns,
    };
  }

  /**
   * 识别模式
   */
  private identifyPatterns(timeline: TimelineEvent[]): any[] {
    const patterns: any[] = [];
    
    // 检查重复事件
    const eventTypes = new Map<string, number>();
    for (const event of timeline) {
      eventTypes.set(event.type, (eventTypes.get(event.type) || 0) + 1);
    }
    
    for (const [type, count] of eventTypes) {
      if (count >= 3) {
        patterns.push({
          type: 'repeated_events',
          description: `Multiple ${type} events detected (${count} occurrences), indicating a recurring issue`,
          confidence: 0.6,
          evidence: timeline.filter(e => e.type === type).slice(0, 3).map(e => ({
            id: uuidv4(),
            type: 'timeline_event' as const,
            source: 'timeline',
            content: e.content,
            timestamp: e.timestamp,
            relevance: 0.5,
            metadata: {},
          })),
        });
      }
    }
    
    // 检查时间聚集
    const timeClusters = this.findTimeClusters(timeline);
    for (const cluster of timeClusters) {
      patterns.push({
        type: 'time_cluster',
        description: `${cluster.events.length} events occurred within a short time window, suggesting a cascading failure`,
        confidence: 0.7,
        evidence: cluster.events.slice(0, 3).map(e => ({
          id: uuidv4(),
          type: 'timeline_event' as const,
          source: 'timeline',
          content: e.content,
          timestamp: e.timestamp,
          relevance: 0.6,
          metadata: {},
        })),
      });
    }
    
    return patterns;
  }

  /**
   * 查找时间聚集
   */
  private findTimeClusters(timeline: TimelineEvent[]): any[] {
    const clusters: any[] = [];
    const windowMs = 5 * 60 * 1000; // 5分钟窗口
    
    const sorted = [...timeline].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let currentCluster: TimelineEvent[] = [];
    let clusterStart: Date | null = null;
    
    for (const event of sorted) {
      if (!clusterStart) {
        clusterStart = event.timestamp;
        currentCluster = [event];
      } else {
        const timeDiff = event.timestamp.getTime() - clusterStart.getTime();
        
        if (timeDiff <= windowMs) {
          currentCluster.push(event);
        } else {
          if (currentCluster.length >= 3) {
            clusters.push({
              startTime: clusterStart,
              endTime: currentCluster[currentCluster.length - 1].timestamp,
              events: currentCluster,
            });
          }
          
          clusterStart = event.timestamp;
          currentCluster = [event];
        }
      }
    }
    
    // 检查最后一个聚集
    if (currentCluster.length >= 3 && clusterStart) {
      clusters.push({
        startTime: clusterStart,
        endTime: currentCluster[currentCluster.length - 1].timestamp,
        events: currentCluster,
      });
    }
    
    return clusters;
  }

  /**
   * 生成报告
   */
  private async generateReport(environment: Environment): Promise<any> {
    const report = {
      timestamp: new Date(),
      summary: {
        totalTheories: this.theories.length,
        confirmedTheories: this.theories.filter(t => t.status === 'confirmed').length,
        rejectedTheories: this.theories.filter(t => t.status === 'rejected').length,
        averageConfidence: this.calculateAverageConfidence(),
      },
      theories: this.theories.map(t => ({
        id: t.id,
        theory: t.theory,
        confidence: t.confidence,
        status: t.status,
        evidenceCount: t.evidence.length,
      })),
      correlations: this.correlations.length,
      evidenceCollected: this.evidence.length,
      recommendations: this.generateRecommendations(),
    };
    
    return report;
  }

  /**
   * 计算平均置信度
   */
  private calculateAverageConfidence(): number {
    if (this.theories.length === 0) return 0;
    
    const total = this.theories.reduce((sum, t) => sum + t.confidence, 0);
    return total / this.theories.length;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.theories.length === 0) {
      recommendations.push('Collect more data to identify potential root causes');
      return recommendations;
    }
    
    const topTheory = this.theories[0];
    
    if (topTheory.confidence > 0.8) {
      recommendations.push(`High confidence theory identified: ${topTheory.theory}`);
      recommendations.push('Consider implementing automated rollback procedures');
    } else if (topTheory.confidence > 0.5) {
      recommendations.push(`Moderate confidence theory: ${topTheory.theory}`);
      recommendations.push('Gather additional evidence to confirm the theory');
    } else {
      recommendations.push('Low confidence theories detected');
      recommendations.push('Review recent changes and deployments manually');
    }
    
    if (this.correlations.length > 0) {
      recommendations.push(`${this.correlations.length} change correlations found - review deployment logs`);
    }
    
    return recommendations;
  }

  /**
   * 获取理论
   */
  getTheories(): RootCauseTheory[] {
    return [...this.theories];
  }

  /**
   * 获取关联
   */
  getCorrelations(): ChangeCorrelation[] {
    return [...this.correlations];
  }

  /**
   * 获取证据
   */
  getEvidence(): Evidence[] {
    return [...this.evidence];
  }

  /**
   * 更新理论状态
   */
  updateTheoryStatus(theoryId: string, status: RootCauseTheory['status']): void {
    const theory = this.theories.find(t => t.id === theoryId);
    if (theory) {
      theory.status = status;
      theory.updatedAt = new Date();
      this.logger.info(`Updated theory ${theoryId} status to ${status}`);
    }
  }

  /**
   * 清除数据
   */
  clearData(): void {
    this.theories = [];
    this.correlations = [];
    this.evidence = [];
    this.logger.info('RCA data cleared');
  }

  /**
   * 克隆代理
   */
  clone(): RCAChangeAgent {
    return new RCAChangeAgent(this.config);
  }

  /**
   * 销毁代理
   */
  destroy(): void {
    this.theories = [];
    this.correlations = [];
    this.evidence = [];
    super.destroy();
    this.logger.info('RCA Change Agent destroyed');
  }
}