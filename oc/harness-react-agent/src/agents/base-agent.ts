/**
 * 基础代理类
 * 
 * 所有代理都继承此类，提供ReAct循环的基础实现
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IAgent,
  AgentState,
  AgentConfig,
  Thought,
  Action,
  Observation,
  Environment,
  Perception,
  ReactStep,
  ReactResult,
} from '../types/agent';
import { Logger } from '../utils/logger';

export abstract class BaseAgent implements IAgent {
  protected readonly id: string;
  protected readonly name: string;
  protected config: AgentConfig;
  protected state: AgentState;
  protected logger: Logger;
  protected steps: ReactStep[] = [];
  protected startTime: Date | null = null;

  constructor(name: string, config?: Partial<AgentConfig>) {
    this.id = uuidv4();
    this.name = name;
    this.config = this.mergeConfig(config);
    this.logger = new Logger(this.config.logLevel, name);
    
    this.state = {
      id: this.id,
      name: this.name,
      status: 'idle',
      currentStep: 0,
      totalSteps: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      metadata: {},
    };

    this.logger.debug(`Agent ${this.name} created with ID: ${this.id}`);
  }

  /**
   * 合并默认配置和用户配置
   */
  private mergeConfig(userConfig?: Partial<AgentConfig>): AgentConfig {
    const defaultConfig: AgentConfig = {
      name: this.name,
      maxSteps: 10,
      timeout: 30000,
      retryCount: 3,
      logLevel: 'info',
      enableTracing: true,
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * 获取代理名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取代理ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取代理状态
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * 获取代理配置
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * 更新代理状态
   */
  protected updateState(updates: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdateTime: new Date(),
    };
  }

  /**
   * 感知环境 - 子类必须实现
   */
  abstract perceive(environment: Environment): Promise<Perception>;

  /**
   * 推理 - 子类必须实现
   */
  abstract reason(perception: Perception): Thought;

  /**
   * 行动 - 子类必须实现
   */
  abstract act(thought: Thought): Action;

  /**
   * 观察行动结果 - 子类必须实现
   */
  abstract observe(action: Action, environment: Environment): Promise<Observation>;

  /**
   * 执行单个ReAct步骤
   */
  async executeStep(environment: Environment): Promise<ReactStep> {
    const stepNumber = this.state.currentStep + 1;
    const startTime = new Date();

    this.logger.info(`Executing step ${stepNumber}`);
    this.updateState({ 
      status: 'thinking', 
      currentStep: stepNumber,
    });

    try {
      // 1. 感知
      this.logger.debug('Perceiving environment...');
      const perception = await this.perceive(environment);

      // 2. 推理
      this.logger.debug('Reasoning...');
      const thought = this.reason(perception);
      this.logger.debug(`Thought: ${thought.content}`);

      // 3. 行动
      this.logger.debug('Acting...');
      this.updateState({ status: 'acting' });
      const action = this.act(thought);
      this.logger.debug(`Action: ${action.type}`);

      // 4. 观察
      this.logger.debug('Observing...');
      this.updateState({ status: 'observing' });
      const observation = await this.observe(action, environment);
      this.logger.debug(`Observation: ${observation.success ? 'success' : 'failed'}`);

      const endTime = new Date();

      // 创建步骤记录
      const step: ReactStep = {
        stepNumber,
        thought,
        action,
        observation,
        startTime,
        endTime,
      };

      this.steps.push(step);

      // 更新环境
      environment.update(observation);

      // 更新状态
      this.updateState({ 
        status: 'idle',
        lastUpdateTime: new Date(),
      });

      this.logger.info(`Step ${stepNumber} completed in ${endTime.getTime() - startTime.getTime()}ms`);

      return step;
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Step ${stepNumber} failed: ${errorMessage}`);

      // 创建错误步骤记录
      const step: ReactStep = {
        stepNumber,
        thought: {
          content: 'Error occurred',
          reasoning: errorMessage,
          confidence: 0,
          nextAction: 'error',
          timestamp: new Date(),
        },
        action: {
          type: 'ERROR',
          name: 'error',
          parameters: { error: errorMessage },
          description: 'Error action',
        },
        observation: {
          success: false,
          data: null,
          error: errorMessage,
          timestamp: new Date(),
          duration: endTime.getTime() - startTime.getTime(),
        },
        startTime,
        endTime,
      };

      this.steps.push(step);

      this.updateState({ 
        status: 'error',
        lastUpdateTime: new Date(),
      });

      throw error;
    }
  }

  /**
   * 检查是否应该继续执行
   */
  protected shouldContinue(step: ReactStep): boolean {
    // 检查是否达到最大步骤数
    if (this.state.currentStep >= this.config.maxSteps) {
      this.logger.warn('Maximum steps reached');
      return false;
    }

    // 检查行动是否为终止类型
    const terminalActions = ['COMPLETE', 'FINISH', 'DONE', 'ERROR'];
    if (terminalActions.includes(step.action.type)) {
      this.logger.info(`Terminal action detected: ${step.action.type}`);
      return false;
    }

    // 检查是否超时
    if (this.startTime) {
      const elapsed = Date.now() - this.startTime.getTime();
      if (elapsed > this.config.timeout) {
        this.logger.warn('Execution timeout reached');
        return false;
      }
    }

    return true;
  }

  /**
   * 生成执行结果
   */
  protected generateResult(): ReactResult {
    const lastStep = this.steps[this.steps.length - 1];
    const totalTime = this.startTime 
      ? Date.now() - this.startTime.getTime()
      : 0;

    return {
      success: lastStep?.observation.success ?? false,
      steps: [...this.steps],
      answer: this.extractAnswer(),
      totalSteps: this.steps.length,
      totalTime,
      metadata: {
        agentId: this.id,
        agentName: this.name,
        startTime: this.startTime,
        endTime: new Date(),
      },
    };
  }

  /**
   * 提取最终答案 - 子类可以覆盖
   */
  protected extractAnswer(): string {
    const lastStep = this.steps[this.steps.length - 1];
    if (!lastStep) {
      return 'No steps executed';
    }

    // 尝试从观察数据中提取答案
    if (lastStep.observation.data?.answer) {
      return lastStep.observation.data.answer;
    }

    // 尝试从思考中提取答案
    if (lastStep.thought.content) {
      return lastStep.thought.content;
    }

    return 'Unable to extract answer';
  }

  /**
   * 运行ReAct循环
   */
  async run(environment: Environment): Promise<ReactResult> {
    this.logger.info(`Starting ReAct loop for agent: ${this.name}`);
    
    this.startTime = new Date();
    this.steps = [];
    
    this.updateState({
      status: 'idle',
      currentStep: 0,
      totalSteps: this.config.maxSteps,
      startTime: this.startTime,
      lastUpdateTime: this.startTime,
    });

    try {
      let shouldContinue = true;

      while (shouldContinue) {
        const step = await this.executeStep(environment);
        shouldContinue = this.shouldContinue(step);
      }

      const result = this.generateResult();
      
      this.updateState({ status: 'completed' });
      this.logger.info(`ReAct loop completed. Total steps: ${result.totalSteps}`);

      return result;
    } catch (error) {
      this.updateState({ status: 'error' });
      
      const result = this.generateResult();
      result.success = false;
      
      this.logger.error(`ReAct loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return result;
    }
  }

  /**
   * 重置代理状态
   */
  reset(): void {
    this.steps = [];
    this.startTime = null;
    
    this.updateState({
      status: 'idle',
      currentStep: 0,
      totalSteps: 0,
      startTime: new Date(),
      lastUpdateTime: new Date(),
      metadata: {},
    });

    this.logger.debug('Agent state reset');
  }

  /**
   * 停止代理执行
   */
  stop(): void {
    this.updateState({ status: 'idle' });
    this.logger.info('Agent stopped');
  }

  /**
   * 获取执行步骤
   */
  getSteps(): ReactStep[] {
    return [...this.steps];
  }

  /**
   * 获取当前步骤数
   */
  getCurrentStep(): number {
    return this.state.currentStep;
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return ['thinking', 'acting', 'observing'].includes(this.state.status);
  }

  /**
   * 检查是否已完成
   */
  isCompleted(): boolean {
    return this.state.status === 'completed';
  }

  /**
   * 检查是否有错误
   */
  hasError(): boolean {
    return this.state.status === 'error';
  }

  /**
   * 获取运行时间
   */
  getRunningTime(): number {
    if (!this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime.getTime();
  }

  /**
   * 导出代理状态
   */
  exportState(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      config: this.config,
      state: this.state,
      steps: this.steps,
      startTime: this.startTime,
    };
  }

  /**
   * 导入代理状态
   */
  importState(state: Record<string, any>): void {
    if (state.id) this.id = state.id;
    if (state.name) this.name = state.name;
    if (state.config) this.config = { ...this.config, ...state.config };
    if (state.state) this.state = { ...this.state, ...state.state };
    if (state.steps) this.steps = state.steps;
    if (state.startTime) this.startTime = state.startTime;
  }

  /**
   * 克隆代理
   */
  abstract clone(): BaseAgent;

  /**
   * 销毁代理
   */
  destroy(): void {
    this.stop();
    this.steps = [];
    this.startTime = null;
    this.logger.debug('Agent destroyed');
  }
}