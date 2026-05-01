/**
 * Analyze命令 - 分析事件
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createLogger } from '../../utils/logger';
import { RCAChangeAgent } from '../../agents/rca-agent';
import { ReactEngine } from '../../core/react-engine';
import { Environment } from '../../types/agent';

const logger = createLogger('AnalyzeCommand', 'info');

/**
 * 创建分析环境
 */
function createAnalysisEnvironment(incidentId: string): Environment {
  const state: Record<string, any> = {
    incidentId,
    timeline: [],
    changeEvents: [],
    metrics: {},
    logs: [],
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
 * 生成模拟分析数据
 */
function generateAnalysisData(incidentId: string): any {
  return {
    timeline: [
      {
        id: 'evt-1',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        type: 'incident',
        source: 'monitoring',
        content: `Incident ${incidentId}: Payment service returning 500 errors`,
        importance: 0.9,
        metadata: {},
      },
      {
        id: 'evt-2',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        type: 'alert',
        source: 'datadog',
        content: 'High error rate detected in payment-service',
        importance: 0.8,
        metadata: {},
      },
      {
        id: 'evt-3',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        type: 'status_change',
        source: 'slack',
        content: 'Team investigating payment service outage',
        importance: 0.7,
        metadata: {},
      },
    ],
    changeEvents: [
      {
        id: 'chg-1',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
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
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        type: 'code_commit',
        source: 'github',
        description: 'Updated payment processing logic',
        author: 'Charlie',
        repository: 'payment-service',
        branch: 'feature/new-processor',
        commitHash: 'def456',
        metadata: {},
      },
      {
        id: 'chg-3',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        type: 'config_change',
        source: 'harness-config',
        description: 'Updated payment gateway timeout configuration',
        author: 'Alice',
        metadata: {},
      },
    ],
  };
}

export const analyzeCommand = new Command('analyze')
  .description('Analyze incidents and find root causes')
  .argument('<incident-id>', 'Incident ID to analyze')
  .option('-s, --steps <number>', 'Maximum analysis steps', '10')
  .option('-w, --window <minutes>', 'Correlation window in minutes', '30')
  .option('-c, --confidence <threshold>', 'Minimum confidence threshold', '0.5')
  .option('-o, --output <format>', 'Output format (text, json)', 'text')
  .option('--mock', 'Use mock data for demonstration', false)
  .action(async (incidentId, options) => {
    const spinner = ora(`Analyzing incident: ${incidentId}`).start();
    
    try {
      // 创建环境
      const environment = createAnalysisEnvironment(incidentId);
      
      // 加载数据
      if (options.mock) {
        spinner.text = 'Loading mock analysis data...';
        const data = generateAnalysisData(incidentId);
        
        environment.update({
          success: true,
          data,
          timestamp: new Date(),
          duration: 0,
        });
      } else {
        // 在实际应用中，这里会从Harness API获取数据
        spinner.warn(chalk.yellow('No data source configured. Use --mock for demonstration.'));
        process.exit(1);
      }
      
      // 创建RCA代理
      spinner.text = 'Initializing RCA Agent...';
      const rcaAgent = new RCAChangeAgent({
        maxSteps: parseInt(options.steps),
        correlationWindow: parseInt(options.window),
        minConfidence: parseFloat(options.confidence),
        logLevel: process.env.LOG_LEVEL as any || 'info',
      });
      
      // 创建ReAct引擎
      const engine = new ReactEngine({
        maxSteps: parseInt(options.steps),
        enableTracing: true,
        logLevel: process.env.LOG_LEVEL as any || 'info',
      });
      
      spinner.text = 'Running root cause analysis...';
      
      // 运行分析
      const result = await engine.run(rcaAgent, environment);
      
      spinner.succeed(chalk.green('Analysis completed'));
      
      // 输出结果
      if (options.output === 'json') {
        // JSON格式输出
        const jsonOutput = {
          incidentId,
          timestamp: new Date().toISOString(),
          success: result.success,
          totalSteps: result.totalSteps,
          totalTime: result.totalTime,
          answer: result.answer,
          theories: rcaAgent.getTheories(),
          correlations: rcaAgent.getCorrelations(),
          evidence: rcaAgent.getEvidence(),
        };
        
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        // 文本格式输出
        console.log(chalk.blue(`\n${'='.repeat(60)}`));
        console.log(chalk.blue.bold(`Root Cause Analysis: ${incidentId}`));
        console.log(chalk.blue(`${'='.repeat(60)}\n`));
        
        // 基本信息
        console.log(chalk.blue('📊 Analysis Summary:'));
        console.log(chalk.white(`  Steps: ${result.totalSteps}`));
        console.log(chalk.white(`  Time: ${result.totalTime}ms`));
        console.log(chalk.white(`  Success: ${result.success ? '✅' : '❌'}`));
        
        // 理论
        const theories = rcaAgent.getTheories();
        if (theories.length > 0) {
          console.log(chalk.blue('\n🔍 Theories:'));
          for (const theory of theories) {
            const confidence = Math.round(theory.confidence * 100);
            const statusIcon = theory.status === 'confirmed' ? '✅' : 
                              theory.status === 'rejected' ? '❌' : '⏳';
            
            console.log(chalk.white(`\n  ${statusIcon} Theory (Confidence: ${confidence}%):`));
            console.log(chalk.white(`     ${theory.theory}`));
            
            if (theory.reasoning) {
              console.log(chalk.gray(`     Reasoning: ${theory.reasoning}`));
            }
          }
        }
        
        // 关联
        const correlations = rcaAgent.getCorrelations();
        if (correlations.length > 0) {
          console.log(chalk.blue('\n🔗 Change Correlations:'));
          for (const corr of correlations) {
            const score = Math.round(corr.correlationScore * 100);
            console.log(chalk.white(`  • Score: ${score}% - ${corr.reasoning}`));
          }
        }
        
        // 证据
        const evidence = rcaAgent.getEvidence();
        if (evidence.length > 0) {
          console.log(chalk.blue('\n📋 Evidence Collected:'));
          console.log(chalk.white(`  Total: ${evidence.length} pieces of evidence`));
        }
        
        // 建议
        console.log(chalk.blue('\n💡 Recommendations:'));
        if (theories.length > 0 && theories[0].confidence > 0.7) {
          console.log(chalk.white('  1. High confidence root cause identified'));
          console.log(chalk.white('  2. Consider rolling back the recent deployment'));
          console.log(chalk.white('  3. Review the changes in payment-service v2.5.0'));
        } else {
          console.log(chalk.white('  1. Gather more data to improve analysis'));
          console.log(chalk.white('  2. Check monitoring dashboards for anomalies'));
          console.log(chalk.white('  3. Review recent team communications'));
        }
        
        console.log(chalk.blue(`\n${'='.repeat(60)}\n`));
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      logger.error(`Analyze command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (process.env.LOG_LEVEL === 'debug') {
        console.error(error);
      }
      
      process.exit(1);
    }
  });