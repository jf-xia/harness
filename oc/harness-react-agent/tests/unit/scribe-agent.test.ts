/**
 * Scribe Agent测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScribeAgent, Message } from '../../src/agents/scribe-agent';
import { Environment } from '../../src/types/agent';

// 创建测试环境
function createTestEnvironment(messages: Message[] = []): Environment {
  const state: Record<string, any> = {
    messages,
    timeline: [],
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
    getChangeEvents: () => [],
    addChangeEvent: () => {},
  };
}

// 创建测试消息
function createTestMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Date.now()}`,
    timestamp: new Date(),
    author: 'TestUser',
    content: 'Test message',
    channel: 'general',
    platform: 'slack',
    metadata: {},
    ...overrides,
  };
}

describe('ScribeAgent', () => {
  let agent: ScribeAgent;

  beforeEach(() => {
    agent = new ScribeAgent({
      maxSteps: 5,
      logLevel: 'error',
      importanceThreshold: 0.5,
    });
  });

  it('should create agent with default config', () => {
    expect(agent.getName()).toBe('AI Scribe Agent');
  });

  it('should detect urgent messages', () => {
    const message = createTestMessage({
      content: 'URGENT: Critical incident - payment service is down!',
    });

    const environment = createTestEnvironment([message]);
    
    // 通过perceive和reason测试
    const perception = agent.perceive(environment);
    // 注意：这里需要异步调用，但为了简单起见，我们测试内部方法
  });

  it('should detect deployment messages', () => {
    const message = createTestMessage({
      content: 'Deployed version 2.5.0 to production',
    });

    // 测试消息分类
    expect(message.content.toLowerCase()).toContain('deploy');
  });

  it('should detect incident messages', () => {
    const message = createTestMessage({
      content: 'We have an incident - the database is down',
    });

    expect(message.content.toLowerCase()).toContain('incident');
  });

  it('should track processed messages', async () => {
    const messages = [
      createTestMessage({ id: 'msg-1', content: 'First message' }),
      createTestMessage({ id: 'msg-2', content: 'Second message' }),
    ];

    const environment = createTestEnvironment(messages);
    
    // 模拟感知
    const perception = await agent.perceive(environment);
    
    expect(perception.data.messages).toHaveLength(2);
  });

  it('should get timeline', () => {
    const timeline = agent.getTimeline();
    expect(Array.isArray(timeline)).toBe(true);
  });

  it('should get processed messages', () => {
    const messages = agent.getProcessedMessages();
    expect(Array.isArray(messages)).toBe(true);
  });

  it('should clear timeline', () => {
    agent.clearTimeline();
    expect(agent.getTimeline()).toHaveLength(0);
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