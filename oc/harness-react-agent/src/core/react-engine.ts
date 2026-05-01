/**
 * ReAct引擎
 * 
 * 实现ReAct（Reasoning + Acting）架构的核心引擎
 * 管理代理的推理-行动-观察循环
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IAgent,
  Environment,
  ReactStep,
  ReactResult,
  Thought,
  Action,
  Observation,
} from '../types/agent';
import { Logger } from '../utils/logger';

/**
 * ReAct引擎配置
 */
export interface ReactEngineConfig {
  maxSteps: number;
  timeout: number;
  enableTracing: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  stopOnFailure: boolean;
  collectMetrics: boolean;
}

/**
 * 执行指标
 */
export interface ExecutionMetrics {
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalTime: number;
  averageStepTime: number;
  thoughtTimes: number[];
  actionTimes: number[];
  observationTimes: number[];
}

/**
 * ReAct引擎类
 */
export class ReactEngine {
  private readonly id: string;
  private config: ReactEngineConfig;
  private logger: Logger;
  private steps: ReactStep[] = [];
  private metrics: ExecutionMetrics;
  private startTime: Date | null = null;
  private isRunning: boolean = false;

  constructor(config?: Partial<ReactEngineConfig>) {
    this.id = uuidv4();
    this.config = this.mergeConfig(config);
    this.logger = new Logger(this.config.logLevel, 'ReactEngine');
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * 合并默认配置
   */
  private mergeConfig(userConfig?: Partial<ReactEngineConfig>): ReactEngineConfig {
    const defaultConfig: ReactEngineConfig = {
      maxSteps: 10,
      timeout: 60000, // 1分钟
      enableTracing: true,
      logLevel: 'info',
      stopOnFailure: true,
      collectMetrics: true,
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * 创建空指标
   */
  private createEmptyMetrics(): ExecutionMetrics {
    return {
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      totalTime: 0,
      averageStepTime: 0,
      thoughtTimes: [],
      actionTimes: [],
      observationTimes: [],
    };
  }

  /**
   * 获取引擎ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取配置
   */
  getConfig(): ReactEngineConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<ReactEngineConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.debug('Engine config updated', updates);
  }

  /**
   * 获取执行步骤
   */
  getSteps(): ReactStep[] {
    return [...this.steps];
  }

  /**
   * 获取执行指标
   */
  getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * 检查是否正在运行
   */
  isExecuting(): boolean {
    return this.isRunning;
  }

  /**
   * 执行单个ReAct循环步骤
   */
  async executeStep(
    agent: IAgent,
    environment: Environment,
    stepNumber: number
  ): Promise<ReactStep> {
    const stepStartTime = Date.now();
    this.logger.info(`Executing step ${stepNumber}`);

    // 1. 推理阶段
    const thoughtStartTime = Date.now();
    this.logger.debug('Starting reasoning phase...');
    
    let perception;
    try {
      perception = await agent.perceive(environment);
    } catch (error) {
      this.logger.error('Perception failed', error);
      throw new Error(`Perception failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const thought = agent.reason(perception);
    const thoughtTime = Date.now() - thoughtStartTime;
    
    this.logger.debug(`Reasoning completed in ${thoughtTime}ms`);
    this.logger.debug(`Thought: ${thought.content}`);
    this.logger.debug(`Next action: ${thought.nextAction}`);

    // 2. 行动阶段
    const actionStartTime = Date.now();
    this.logger.debug('Starting action phase...');
    
    const action = agent.act(thought);
    const actionTime = Date.now() - actionStartTime;
    
    this.logger.debug(`Action completed in ${actionTime}ms`);
    this.logger.debug(`Action type: ${action.type}`);

    // 3. 观察阶段
    const observationStartTime = Date.now();
    this.logger.debug('Starting observation phase...');
    
    let observation: Observation;
    try {
      observation = await agent.observe(action, environment);
    } catch (error) {
      this.logger.error('Observation failed', error);
      observation = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        duration: Date.now() - observationStartTime,
      };
    }

    const observationTime = Date.now() - observationStartTime;
    
    this.logger.debug(`Observation completed in ${observationTime}ms`);
    this.logger.debug(`Observation success: ${observation.success}`);

    // 4. 记录步骤
    const step: ReactStep = {
      stepNumber,
      thought,
      action,
      observation,
      startTime: new Date(stepStartTime),
      endTime: new Date(),
    };

    this.steps.push(step);

    // 5. 更新指标
    if (this.config.collectMetrics) {
      this.updateMetrics(step, thoughtTime, actionTime, observationTime);
    }

    // 6. 更新环境
    environment.update(observation);

    const totalStepTime = Date.now() - stepStartTime;
    this.logger.info(`Step ${stepNumber} completed in ${totalStepTime}ms`);

    return step;
  }

  /**
   * 更新执行指标
   */
  private updateMetrics(
    step: ReactStep,
    thoughtTime: number,
    actionTime: number,
    observationTime: number
  ): void {
    this.metrics.totalSteps++;
    
    if (step.observation.success) {
      this.metrics.successfulSteps++;
    } else {
      this.metrics.failedSteps++;
    }

    this.metrics.thoughtTimes.push(thoughtTime);
    this.metrics.actionTimes.push(actionTime);
    this.metrics.observationTimes.push(observationTime);

    const stepTime = step.endTime.getTime() - step.startTime.getTime();
    this.metrics.totalTime += stepTime;
    this.metrics.averageStepTime = this.metrics.totalTime / this.metrics.totalSteps;
  }

  /**
   * 检查是否应该继续执行
   */
  private shouldContinue(step: ReactStep, stepNumber: number): boolean {
    // 检查最大步骤数
    if (stepNumber >= this.config.maxSteps) {
      this.logger.warn(`Maximum steps (${this.config.maxSteps}) reached`);
      return false;
    }

    // 检查超时
    if (this.startTime) {
      const elapsed = Date.now() - this.startTime.getTime();
      if (elapsed > this.config.timeout) {
        this.logger.warn(`Timeout (${this.config.timeout}ms) reached`);
        return false;
      }
    }

    // 检查失败停止
    if (this.config.stopOnFailure && !step.observation.success) {
      this.logger.warn('Stopping due to failure');
      return false;
    }

    // 检查终止行动
    const terminalActions = ['COMPLETE', 'FINISH', 'DONE', 'TERMINATE', 'EXIT'];
    if (terminalActions.includes(step.action.type)) {
      this.logger.info(`Terminal action detected: ${step.action.type}`);
      return false;
    }

    // 检查终止思考
    if (step.thought.nextAction === 'complete' || step.thought.nextAction === 'finish') {
      this.logger.info('Terminal thought detected');
      return false;
    }

    return true;
  }

  /**
   * 提取最终答案
   */
  private extractAnswer(): string {
    if (this.steps.length === 0) {
      return 'No steps executed';
    }

    // 尝试从最后一个步骤中提取答案
    const lastStep = this.steps[this.steps.length - 1];
    
    // 首先尝试从观察数据中提取
    if (lastStep.observation.data?.answer) {
      return lastStep.observation.data.answer;
    }

    // 然后尝试从思考中提取
    if (lastStep.thought.content && lastStep.thought.confidence > 0.5) {
      return lastStep.thought.content;
    }

    // 最后尝试组合所有步骤的思考
    const thoughts = this.steps
      .filter(step => step.thought.confidence > 0.3)
      .map(step => step.thought.content)
      .join('\n');

    if (thoughts) {
      return thoughts;
    }

    return 'Unable to extract answer';
  }

  /**
   * 生成执行结果
   */
  private generateResult(): ReactResult {
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
        engineId: this.id,
        startTime: this.startTime,
        endTime: new Date(),
        metrics: this.config.collectMetrics ? this.metrics : undefined,
      },
    };
  }

  /**
   * 运行ReAct循环
   */
  async run(
    agent: IAgent,
    environment: Environment,
    initialContext?: Record<string, any>
  ): Promise<ReactResult> {
    this.logger.info(`Starting ReAct loop with agent: ${agent.getName()}`);
    
    // 初始化
    this.startTime = new Date();
    this.steps = [];
    this.isRunning = true;
    this.metrics = this.createEmptyMetrics();

    if (initialContext) {
      this.logger.debug('Initial context:', initialContext);
    }

    try {
      let stepNumber = 0;
      let shouldContinue = true;

      while (shouldContinue) {
        stepNumber++;
        
        // 执行步骤
        const step = await this.executeStep(agent, environment, stepNumber);
        
        // 检查是否继续
        shouldContinue = this.shouldContinue(step, stepNumber);

        // 如果启用追踪，输出步骤信息
        if (this.config.enableTracing) {
          this.traceStep(step);
        }
      }

      // 生成结果
      const result = this.generateResult();
      
      this.isRunning = false;
      this.logger.info(`ReAct loop completed. Total steps: ${result.totalSteps}`);
      this.logger.info(`Total time: ${result.totalTime}ms`);

      return result;
    } catch (error) {
      this.isRunning = false;
      
      const result = this.generateResult();
      result.success = false;
      
      this.logger.error(`ReAct loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      throw error;
    }
  }

  /**
   * 追踪步骤信息
   */
  private traceStep(step: ReactStep): void {
    const stepTime = step.endTime.getTime() - step.startTime.getTime();
    
    this.logger.group(`Step ${step.stepNumber} (${stepTime}ms)`);
    this.logger.debug(`Thought: ${step.thought.content}`);
    this.logger.debug(`Reasoning: ${step.thought.reasoning}`);
    this.logger.debug(`Action: ${step.action.type} - ${step.action.description}`);
    this.logger.debug(`Success: ${step.observation.success}`);
    
    if (step.observation.error) {
      this.logger.debug(`Error: ${step.observation.error}`);
    }
    
    this.logger.groupEnd();
  }

  /**
   * 停止执行
   */
  stop(): void {
    this.isRunning = false;
    this.logger.info('Engine stopped');
  }

  /**
   * 重置引擎状态
   */
  reset(): void {
    this.steps = [];
    this.startTime = null;
    this.isRunning = false;
    this.metrics = this.createEmptyMetrics();
    this.logger.debug('Engine state reset');
  }

  /**
   * 导出执行状态
   */
  exportState(): Record<string, any> {
    return {
      id: this.id,
      config: this.config,
      steps: this.steps,
      metrics: this.metrics,
      startTime: this.startTime,
      isRunning: this.isRunning,
    };
  }

  /**
   * 导入执行状态
   */
  importState(state: Record<string, any>): void {
    if (state.config) this.config = { ...this.config, ...state.config };
    if (state.steps) this.steps = state.steps;
    if (state.metrics) this.metrics = state.metrics;
    if (state.startTime) this.startTime = state.startTime;
    if (state.isRunning !== undefined) this.isRunning = state.isRunning;
  }
}

/**
 * 创建ReAct引擎实例
 */
export function createReactEngine(config?: Partial<ReactEngineConfig>): ReactEngine {
  return new ReactEngine(config);
}