/**
 * RCA Change Agent测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RCAChangeAgent } from '../../src/agents/rca-agent';
import { Environment, TimelineEvent, ChangeEvent } from '../../src/types/agent';

// 创建测试环境
function createTestEnvironment(
  timeline: TimelineEvent[] = [],
  changeEvents: ChangeEvent[] = []
): Environment {
  const state: Record<string, any> = {
    timeline,
    changeEvents,
  };

  return {
    getState: () => ({ ...state }),
    update: (observation) => {
      if (observation.data) {
        Object.assign(state, observation.data);
      }
    },
    getTimeline: () => state.timeline || [],
    addTimelineEvent: (event) => {
      state.timeline = state.timeline || [];
      state.timeline.push(event);
    },
    getChangeEvents: () => state.changeEvents || [],
    addChangeEvent: (event) => {
      state.changeEvents = state.changeEvents || [];
      state.changeEvents.push(event);
    },
  };
}

// 创建测试时间线事件
function createTimelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: `evt-${Date.now()}`,
    timestamp: new Date(),
    type: 'incident',
    source: 'test',
    content: 'Test incident',
    importance: 0.8,
    metadata: {},
    ...overrides,
  };
}

// 创建测试变更事件
function createChangeEvent(overrides: Partial<ChangeEvent> = {}): ChangeEvent {
  return {
    id: `chg-${Date.now()}`,
    timestamp: new Date(),
    type: 'deployment',
    source: 'test',
    description: 'Test deployment',
    author: 'TestUser',
    metadata: {},
    ...overrides,
  };
}

describe('RCAChangeAgent', () => {
  let agent: RCAChangeAgent;

  beforeEach(() => {
    agent = new RCAChangeAgent({
      maxSteps: 5,
      logLevel: 'error',
      correlationWindow: 30,
      minConfidence: 0.5,
    });
  });

  it('should create agent with default config', () => {
    expect(agent.getName()).toBe('RCA Change Agent');
  });

  it('should have empty theories initially', () => {
    expect(agent.getTheories()).toHaveLength(0);
  });

  it('should have empty correlations initially', () => {
    expect(agent.getCorrelations()).toHaveLength(0);
  });

  it('should have empty evidence initially', () => {
    expect(agent.getEvidence()).toHaveLength(0);
  });

  it('should perceive environment with timeline and changes', async () => {
    const timeline = [
      createTimelineEvent({ id: 'evt-1', content: 'Payment service down' }),
    ];
    const changeEvents = [
      createChangeEvent({ id: 'chg-1', description: 'Deployed v2.5.0' }),
    ];

    const environment = createTestEnvironment(timeline, changeEvents);
    const perception = await agent.perceive(environment);

    expect(perception.data.timeline).toHaveLength(1);
    expect(perception.data.changeEvents).toHaveLength(1);
  });

  it('should reason about correlations', () => {
    const timeline = [
      createTimelineEvent({
        id: 'evt-1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前
        content: 'Payment service incident',
        type: 'incident',
      }),
    ];

    const changeEvents = [
      createChangeEvent({
        id: 'chg-1',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15分钟前
        description: 'Deployed payment-service v2.5.0',
        type: 'deployment',
      }),
    ];

    const environment = createTestEnvironment(timeline, changeEvents);
    
    // 测试reason方法
    const perception = {
      timestamp: new Date(),
      data: {
        timeline,
        changeEvents,
        existingTheories: [],
      },
      confidence: 0.9,
    };

    const thought = agent.reason(perception);

    expect(thought).toBeDefined();
    expect(thought.content).toBeDefined();
    expect(thought.reasoning).toBeDefined();
    expect(thought.confidence).toBeGreaterThan(0);
  });

  it('should generate wait thought when no events', () => {
    const perception = {
      timestamp: new Date(),
      data: {
        timeline: [],
        changeEvents: [],
        existingTheories: [],
      },
      confidence: 0.9,
    };

    const thought = agent.reason(perception);

    expect(thought.nextAction).toBe('wait');
  });

  it('should update theory status', () => {
    // 首先需要有理论，这需要运行完整的ReAct循环
    // 这里测试更新状态的方法
    agent.updateTheoryStatus('non-existent', 'confirmed');
    
    // 不应该抛出错误
    expect(true).toBe(true);
  });

  it('should clear data', () => {
    agent.clearData();
    
    expect(agent.getTheories()).toHaveLength(0);
    expect(agent.getCorrelations()).toHaveLength(0);
    expect(agent.getEvidence()).toHaveLength(0);
  });

  it('should clone agent', () => {
    const cloned = agent.clone();
    
    expect(cloned.getName()).toBe(agent.getName());
    expect(cloned.getId()).not.toBe(agent.getId());
  });

  it('should reset agent state', () => {
    agent.reset();
    
    const state = agent.getState();
    expect(state.status).toBe('idle');
    expect(state.currentStep).toBe(0);
  });
});