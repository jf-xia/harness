/**
 * Harness Agent 演示脚本
 * 
 * 展示如何使用Harness Agent CLI工具
 */

import chalk from 'chalk';
import { ScribeAgent } from '../src/agents/scribe-agent';
import { RCAChangeAgent } from '../src/agents/rca-agent';
import { ReactEngine } from '../src/core/react-engine';
import { Environment, TimelineEvent, ChangeEvent } from '../src/types/agent';

/**
 * 创建演示环境
 */
function createDemoEnvironment(): Environment {
  const state: Record<string, any> = {
    messages: [
      {
        id: 'msg-1',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        author: 'Alice',
        content: 'URGENT: Critical incident - payment service is down!',
        channel: 'incidents',
        platform: 'slack',
        metadata: {},
      },
      {
        id: 'msg-2',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        author: 'Bob',
        content: 'I just deployed version 2.5.0 to production',
        channel: 'deployments',
        platform: 'slack',
        metadata: {},
      },
      {
        id: 'msg-3',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        author: 'Charlie',
        content: 'Decided to rollback the last deployment',
        channel: 'incidents',
        platform: 'slack',
        metadata: {},
      },
      {
        id: 'msg-4',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        author: 'Alice',
        content: 'Alert: CPU usage exceeded 90% threshold',
        channel: 'monitoring',
        platform: 'slack',
        metadata: {},
      },
    ],
    timeline: [
      {
        id: 'evt-1',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        type: 'incident',
        source: 'monitoring',
        content: 'Payment service returning 500 errors',
        importance: 0.9,
        metadata: {},
      },
      {
        id: 'evt-2',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        type: 'alert',
        source: 'datadog',
        content: 'High error rate detected in payment-service',
        importance: 0.8,
        metadata: {},
      },
    ],
    changeEvents: [
      {
        id: 'chg-1',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        type: 'deployment',
        source: 'harness-ci',
        description: 'Deployed payment-service v2.5.0 to production',
        author: 'Bob',
        repository: 'payment-service',
        branch: 'main',
        commitHash: 'abc123',
        metadata: {},
      },
      {
        id: 'chg-2',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        type: 'code_commit',
        source: 'github',
        description: 'Updated payment processing logic',
        author: 'Charlie',
        repository: 'payment-service',
        branch: 'feature/new-processor',
        commitHash: 'def456',
        metadata: {},
      },
    ],
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

/**
 * 运行Scribe Agent演示
 */
async function runScribeDemo() {
  console.log(chalk.blue.bold('\n' + '='.repeat(60)));
  console.log(chalk.blue.bold('AI Scribe Agent Demo'));
  console.log(chalk.blue.bold('='.repeat(60) + '\n'));

  const agent = new ScribeAgent({
    maxSteps: 5,
    logLevel: 'info',
    importanceThreshold: 0.6,
  });

  const engine = new ReactEngine({
    maxSteps: 5,
    enableTracing: true,
    logLevel: 'info',
  });

  const environment = createDemoEnvironment();

  console.log(chalk.yellow('Starting Scribe Agent...'));
  console.log(chalk.gray('The agent will monitor communications and record important events.\n'));

  const result = await engine.run(agent, environment);

  console.log(chalk.green.bold('\n✅ Scribe Agent Demo Completed!'));
  console.log(chalk.white(`  Steps: ${result.totalSteps}`));
  console.log(chalk.white(`  Time: ${result.totalTime}ms`));
  console.log(chalk.white(`  Success: ${result.success ? 'Yes' : 'No'}`));

  const timeline = agent.getTimeline();
  if (timeline.length > 0) {
    console.log(chalk.blue('\n📋 Recorded Events:'));
    for (const event of timeline) {
      console.log(chalk.white(`  • ${event.content}`));
    }
  }
}

/**
 * 运行RCA Agent演示
 */
async function runRCADemo() {
  console.log(chalk.blue.bold('\n' + '='.repeat(60)));
  console.log(chalk.blue.bold('RCA Change Agent Demo'));
  console.log(chalk.blue.bold('='.repeat(60) + '\n'));

  const agent = new RCAChangeAgent({
    maxSteps: 5,
    logLevel: 'info',
    correlationWindow: 30,
    minConfidence: 0.5,
  });

  const engine = new ReactEngine({
    maxSteps: 5,
    enableTracing: true,
    logLevel: 'info',
  });

  const environment = createDemoEnvironment();

  console.log(chalk.yellow('Starting RCA Agent...'));
  console.log(chalk.gray('The agent will analyze incidents and find root causes.\n'));

  const result = await engine.run(agent, environment);

  console.log(chalk.green.bold('\n✅ RCA Agent Demo Completed!'));
  console.log(chalk.white(`  Steps: ${result.totalSteps}`));
  console.log(chalk.white(`  Time: ${result.totalTime}ms`));
  console.log(chalk.white(`  Success: ${result.success ? 'Yes' : 'No'}`));

  const theories = agent.getTheories();
  if (theories.length > 0) {
    console.log(chalk.blue('\n🔍 Root Cause Theories:'));
    for (const theory of theories) {
      const confidence = Math.round(theory.confidence * 100);
      console.log(chalk.white(`  • ${theory.theory}`));
      console.log(chalk.gray(`    Confidence: ${confidence}%`));
    }
  }

  const correlations = agent.getCorrelations();
  if (correlations.length > 0) {
    console.log(chalk.blue('\n🔗 Change Correlations:'));
    for (const corr of correlations) {
      const score = Math.round(corr.correlationScore * 100);
      console.log(chalk.white(`  • Score: ${score}% - ${corr.reasoning}`));
    }
  }
}

/**
 * 运行完整演示
 */
async function runFullDemo() {
  console.log(chalk.green.bold('\n' + '='.repeat(60)));
  console.log(chalk.green.bold('Harness AI SRE Agent - Full Demo'));
  console.log(chalk.green.bold('='.repeat(60) + '\n'));

  console.log(chalk.white('This demo showcases the Harness AI SRE Agent architecture'));
  console.log(chalk.white('using the ReAct (Reasoning + Acting) framework.\n'));

  console.log(chalk.yellow('Architecture Overview:'));
  console.log(chalk.white('  • AI Scribe Agent: Monitors communications and records events'));
  console.log(chalk.white('  • RCA Change Agent: Analyzes incidents and finds root causes'));
  console.log(chalk.white('  • ReAct Engine: Manages the reasoning-acting-observation loop\n'));

  try {
    // 运行Scribe Agent演示
    await runScribeDemo();

    console.log(chalk.gray('\n' + '-'.repeat(60) + '\n'));

    // 运行RCA Agent演示
    await runRCADemo();

    console.log(chalk.green.bold('\n' + '='.repeat(60)));
    console.log(chalk.green.bold('Demo Completed Successfully!'));
    console.log(chalk.green.bold('='.repeat(60) + '\n'));

    console.log(chalk.yellow('Next Steps:'));
    console.log(chalk.white('  1. Try the CLI: npm start -- start --mock'));
    console.log(chalk.white('  2. Run tests: npm test'));
    console.log(chalk.white('  3. Build the project: npm run build'));
    console.log(chalk.white('  4. Read the docs: docs/ folder\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Demo failed:'), error);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  runFullDemo().catch(console.error);
}

export { runScribeDemo, runRCADemo, runFullDemo };