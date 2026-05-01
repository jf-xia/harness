/**
 * ReAct引擎测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactEngine } from '../../src/core/react-engine';
import { BaseAgent } from '../../src/agents/base-agent';
import { Environment, Perception, Thought, Action, Observation } from '../../src/types/agent';

// 创建测试用代理
class TestAgent extends BaseAgent {
  private stepCount = 0;
  private maxSteps: number;

  constructor(maxSteps: number = 3) {
    super('TestAgent', { maxSteps, logLevel: 'error' });
    this.maxSteps = maxSteps;
  }

  async perceive(environment: Environment): Promise<Perception> {
    return {
      timestamp: new Date(),
      data: { step: this.stepCount },
      confidence: 0.9,
    };
  }

  reason(perception: Perception): Thought {
    this.stepCount++;
    
    if (this.stepCount >= this.maxSteps) {
      return {
        content: 'Final step reached',
        reasoning: 'Maximum steps reached, completing',
        confidence: 1.0,
        nextAction: 'complete',
        timestamp: new Date(),
      };
    }

    return {
      content: `Step ${this.stepCount}`,
      reasoning: 'Continuing execution',
      confidence: 0.8,
      nextAction: 'continue',
      timestamp: new Date(),
    };
  }

  act(thought: Thought): Action {
    return {
      type: thought.nextAction === 'complete' ? 'COMPLETE' : 'CONTINUE',
      name: 'test_action',
      parameters: { step: this.stepCount },
      description: `Test action for step ${this.stepCount}`,
    };
  }

  async observe(action: Action, environment: Environment): Promise<Observation> {
    return {
      success: true,
      data: { step: this.stepCount, action: action.type },
      timestamp: new Date(),
      duration: 10,
    };
  }

  clone(): TestAgent {
    return new TestAgent(this.maxSteps);
  }
}

// 创建测试环境
function createTestEnvironment(): Environment {
  const state: Record<string, any> = {};

  return {
    getState: () => ({ ...state }),
    update: (observation) => {
      if (observation.data) {
        Object.assign(state, observation.data);
      }
    },
    getTimeline: () => [],
    addTimelineEvent: () => {},
    getChangeEvents: () => [],
    addChangeEvent: () => {},
  };
}

describe('ReactEngine', () => {
  let engine: ReactEngine;
  let environment: Environment;

  beforeEach(() => {
    engine = new ReactEngine({
      maxSteps: 5,
      timeout: 10000,
      enableTracing: false,
      logLevel: 'error',
    });
    environment = createTestEnvironment();
  });

  it('should create engine with default config', () => {
    const defaultEngine = new ReactEngine();
    const config = defaultEngine.getConfig();
    
    expect(config.maxSteps).toBe(10);
    expect(config.timeout).toBe(60000);
    expect(config.enableTracing).toBe(true);
  });

  it('should create engine with custom config', () => {
    const config = engine.getConfig();
    
    expect(config.maxSteps).toBe(5);
    expect(config.timeout).toBe(10000);
    expect(config.enableTracing).toBe(false);
  });

  it('should run ReAct loop successfully', async () => {
    const agent = new TestAgent(3);
    const result = await engine.run(agent, environment);

    expect(result.success).toBe(true);
    expect(result.totalSteps).toBe(3);
    expect(result.steps).toHaveLength(3);
    expect(result.answer).toBeDefined();
  });

  it('should stop at max steps', async () => {
    const agent = new TestAgent(10);
    const result = await engine.run(agent, environment);

    expect(result.totalSteps).toBeLessThanOrEqual(5);
  });

  it('should track execution metrics', async () => {
    const agent = new TestAgent(3);
    await engine.run(agent, environment);

    const metrics = engine.getMetrics();
    
    expect(metrics.totalSteps).toBe(3);
    expect(metrics.successfulSteps).toBe(3);
    expect(metrics.failedSteps).toBe(0);
    expect(metrics.totalTime).toBeGreaterThanOrEqual(0);
  });

  it('should update config', () => {
    engine.updateConfig({ maxSteps: 20 });
    
    const config = engine.getConfig();
    expect(config.maxSteps).toBe(20);
  });

  it('should get execution steps', async () => {
    const agent = new TestAgent(2);
    await engine.run(agent, environment);

    const steps = engine.getSteps();
    
    expect(steps).toHaveLength(2);
    expect(steps[0].stepNumber).toBe(1);
    expect(steps[1].stepNumber).toBe(2);
  });

  it('should reset engine state', async () => {
    const agent = new TestAgent(3);
    await engine.run(agent, environment);

    engine.reset();

    expect(engine.getSteps()).toHaveLength(0);
    expect(engine.isExecuting()).toBe(false);
  });

  it('should export and import state', async () => {
    const agent = new TestAgent(2);
    await engine.run(agent, environment);

    const state = engine.exportState();
    
    expect(state.id).toBeDefined();
    expect(state.config).toBeDefined();
    expect(state.steps).toHaveLength(2);

    const newEngine = new ReactEngine();
    newEngine.importState(state);

    expect(newEngine.getSteps()).toHaveLength(2);
  });
});