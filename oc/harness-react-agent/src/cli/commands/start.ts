/**
 * Start命令 - 启动AI代理
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createLogger } from '../../utils/logger';
import { ScribeAgent } from '../../agents/scribe-agent';
import { RCAChangeAgent } from '../../agents/rca-agent';
import { ReactEngine } from '../../core/react-engine';
import { Environment } from '../../types/agent';

const logger = createLogger('StartCommand', 'info');

/**
 * 创建模拟环境
 */
function createMockEnvironment(): Environment {
  const state: Record<string, any> = {
    messages: [],
    timeline: [],
    changeEvents: [],
  };

  return {
    getState: () => ({ ...state }),
    update: (observation) => {
      // 更新状态
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

/**
 * 生成模拟消息
 */
function generateMockMessages(): any[] {
  return [
    {
      id: '1',
      timestamp: new Date(),
      author: 'Alice',
      content: 'We have a critical incident - the payment service is down!',
      channel: 'incidents',
      platform: 'slack',
      metadata: {},
    },
    {
      id: '2',
      timestamp: new Date(),
      author: 'Bob',
      content: 'I just deployed version 2.5.0 to production',
      channel: 'deployments',
      platform: 'slack',
      metadata: {},
    },
    {
      id: '3',
      timestamp: new Date(),
      author: 'Charlie',
      content: 'Decided to rollback the last deployment',
      channel: 'incidents',
      platform: 'slack',
      metadata: {},
    },
    {
      id: '4',
      timestamp: new Date(),
      author: 'Alice',
      content: 'Alert: CPU usage exceeded 90% threshold',
      channel: 'monitoring',
      platform: 'slack',
      metadata: {},
    },
    {
      id: '5',
      timestamp: new Date(),
      author: 'Bob',
      content: 'Feature flag "new-checkout" enabled for 10% of users',
      channel: 'feature-flags',
      platform: 'slack',
      metadata: {},
    },
  ];
}

/**
 * 生成模拟变更事件
 */
function generateMockChangeEvents(): any[] {
  return [
    {
      id: 'change-1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前
      type: 'deployment',
      source: 'harness-ci',
      description: 'Deployed version 2.5.0 to production',
      author: 'Bob',
      repository: 'payment-service',
      branch: 'main',
      commitHash: 'abc123',
      metadata: {},
    },
    {
      id: 'change-2',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
      type: 'code_commit',
      source: 'github',
      description: 'Fixed payment processing timeout issue',
      author: 'Charlie',
      repository: 'payment-service',
      branch: 'hotfix/timeout',
      commitHash: 'def456',
      metadata: {},
    },
    {
      id: 'change-3',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
      type: 'feature_flag',
      source: 'harness-ff',
      description: 'Enabled new-checkout feature flag',
      author: 'Alice',
      metadata: {},
    },
  ];
}

export const startCommand = new Command('start')
  .description('Start AI agents')
  .option('-a, --agents <agents>', 'Comma-separated list of agents to start (scribe,rca)', 'scribe,rca')
  .option('-s, --steps <number>', 'Maximum number of steps per agent', '10')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds', '60000')
  .option('-i, --interactive', 'Run in interactive mode', false)
  .option('--mock', 'Use mock data for demonstration', false)
  .action(async (options) => {
    const spinner = ora('Initializing agents...').start();
    
    try {
      // 解析代理列表
      const agentNames = options.agents.split(',').map((a: string) => a.trim());
      
      // 创建环境
      const environment = createMockEnvironment();
      
      // 如果使用模拟数据
      if (options.mock) {
        spinner.text = 'Loading mock data...';
        const messages = generateMockMessages();
        const changeEvents = generateMockChangeEvents();
        
        environment.update({
          success: true,
          data: { messages, changeEvents },
          timestamp: new Date(),
          duration: 0,
        });
      }
      
      // 创建代理
      const agents = [];
      
      if (agentNames.includes('scribe')) {
        agents.push(new ScribeAgent({
          maxSteps: parseInt(options.steps),
          timeout: parseInt(options.timeout),
        }));
      }
      
      if (agentNames.includes('rca')) {
        agents.push(new RCAChangeAgent({
          maxSteps: parseInt(options.steps),
          timeout: parseInt(options.timeout),
        }));
      }
      
      if (agents.length === 0) {
        spinner.fail(chalk.red('No valid agents specified'));
        console.log(chalk.yellow('Available agents: scribe, rca'));
        process.exit(1);
      }
      
      spinner.succeed(chalk.green(`Initialized ${agents.length} agents`));
      
      // 创建ReAct引擎
      const engine = new ReactEngine({
        maxSteps: parseInt(options.steps),
        timeout: parseInt(options.timeout),
        enableTracing: true,
        logLevel: process.env.LOG_LEVEL as any || 'info',
      });
      
      // 运行代理
      for (const agent of agents) {
        console.log(chalk.blue(`\n${'='.repeat(50)}`));
        console.log(chalk.blue.bold(`Running agent: ${agent.getName()}`));
        console.log(chalk.blue(`${'='.repeat(50)}\n`));
        
        const agentSpinner = ora(`Executing ${agent.getName()}...`).start();
        
        try {
          const result = await engine.run(agent, environment);
          
          agentSpinner.succeed(chalk.green(`${agent.getName()} completed`));
          
          // 显示结果
          console.log(chalk.blue('\n📊 Results:'));
          console.log(chalk.white(`  Steps: ${result.totalSteps}`));
          console.log(chalk.white(`  Time: ${result.totalTime}ms`));
          console.log(chalk.white(`  Success: ${result.success ? '✅' : '❌'}`));
          
          console.log(chalk.blue('\n📝 Answer:'));
          console.log(chalk.white(`  ${result.answer}`));
          
          // 显示步骤详情
          if (result.steps.length > 0) {
            console.log(chalk.blue('\n📋 Steps:'));
            for (const step of result.steps) {
              const icon = step.observation.success ? '✅' : '❌';
              console.log(chalk.white(`  ${icon} Step ${step.stepNumber}: ${step.thought.content.substring(0, 60)}...`));
            }
          }
          
        } catch (error) {
          agentSpinner.fail(chalk.red(`${agent.getName()} failed`));
          logger.error(`Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log(chalk.green.bold('\n✅ All agents completed!\n'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to start agents'));
      logger.error(`Start command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (process.env.LOG_LEVEL === 'debug') {
        console.error(error);
      }
      
      process.exit(1);
    }
  });