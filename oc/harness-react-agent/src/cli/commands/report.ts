/**
 * Report命令 - 生成报告
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ReportCommand', 'info');

/**
 * 报告数据接口
 */
interface ReportData {
  title: string;
  timestamp: string;
  summary: {
    totalIncidents: number;
    resolvedIncidents: number;
    averageResolutionTime: number;
    topRootCauses: string[];
  };
  incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    rootCause: string;
    resolutionTime: number;
  }>;
  metrics: {
    mttr: number;
    mtbf: number;
    availability: number;
    errorRate: number;
  };
  recommendations: string[];
}

/**
 * 生成模拟报告数据
 */
function generateMockReportData(): ReportData {
  return {
    title: 'Harness AI SRE Analysis Report',
    timestamp: new Date().toISOString(),
    summary: {
      totalIncidents: 15,
      resolvedIncidents: 12,
      averageResolutionTime: 45, // 分钟
      topRootCauses: [
        'Deployment errors',
        'Configuration changes',
        'Resource exhaustion',
        'Third-party service failures',
      ],
    },
    incidents: [
      {
        id: 'INC-001',
        title: 'Payment Service Outage',
        severity: 'critical',
        status: 'resolved',
        rootCause: 'Deployment of v2.5.0 introduced a regression in payment processing',
        resolutionTime: 35,
      },
      {
        id: 'INC-002',
        title: 'High Latency in API Gateway',
        severity: 'high',
        status: 'resolved',
        rootCause: 'Memory leak in connection pooling',
        resolutionTime: 52,
      },
      {
        id: 'INC-003',
        title: 'Database Connection Timeout',
        severity: 'medium',
        status: 'investigating',
        rootCause: 'Under investigation',
        resolutionTime: 0,
      },
      {
        id: 'INC-004',
        title: 'Feature Flag Misconfiguration',
        severity: 'low',
        status: 'resolved',
        rootCause: 'Incorrect percentage rollout configuration',
        resolutionTime: 15,
      },
      {
        id: 'INC-005',
        title: 'CDN Cache Invalidation Failure',
        severity: 'medium',
        status: 'resolved',
        rootCause: 'CDN provider API rate limiting',
        resolutionTime: 28,
      },
    ],
    metrics: {
      mttr: 45, // Mean Time To Resolve (minutes)
      mtbf: 72, // Mean Time Between Failures (hours)
      availability: 99.95, // 百分比
      errorRate: 0.02, // 百分比
    },
    recommendations: [
      'Implement automated rollback for failed deployments',
      'Add more comprehensive integration tests for payment service',
      'Set up proactive monitoring for memory usage patterns',
      'Create runbooks for common incident scenarios',
      'Implement feature flag validation before rollout',
    ],
  };
}

/**
 * 格式化文本报告
 */
function formatTextReport(data: ReportData): string {
  const lines: string[] = [];
  
  lines.push(chalk.blue.bold(`\n${'='.repeat(60)}`));
  lines.push(chalk.blue.bold(data.title));
  lines.push(chalk.blue(`Generated: ${data.timestamp}`));
  lines.push(chalk.blue(`${'='.repeat(60)}\n`));
  
  // 摘要
  lines.push(chalk.blue.bold('📊 Executive Summary'));
  lines.push(chalk.white(`  Total Incidents: ${data.summary.totalIncidents}`));
  lines.push(chalk.white(`  Resolved: ${data.summary.resolvedIncidents}`));
  lines.push(chalk.white(`  Avg Resolution Time: ${data.summary.averageResolutionTime} minutes`));
  
  lines.push(chalk.white('\n  Top Root Causes:'));
  for (const cause of data.summary.topRootCauses) {
    lines.push(chalk.white(`    • ${cause}`));
  }
  
  // 指标
  lines.push(chalk.blue.bold('\n📈 Key Metrics'));
  lines.push(chalk.white(`  MTTR (Mean Time To Resolve): ${data.metrics.mttr} minutes`));
  lines.push(chalk.white(`  MTBF (Mean Time Between Failures): ${data.metrics.mtbf} hours`));
  lines.push(chalk.white(`  Availability: ${data.metrics.availability}%`));
  lines.push(chalk.white(`  Error Rate: ${data.metrics.errorRate}%`));
  
  // 事件详情
  lines.push(chalk.blue.bold('\n🔍 Incident Details'));
  
  for (const incident of data.incidents) {
    const severityColor = incident.severity === 'critical' ? chalk.red :
                         incident.severity === 'high' ? chalk.yellow :
                         incident.severity === 'medium' ? chalk.blue : chalk.gray;
    
    const statusIcon = incident.status === 'resolved' ? '✅' : 
                      incident.status === 'investigating' ? '🔍' : '⏳';
    
    lines.push(chalk.white(`\n  ${statusIcon} ${incident.id}: ${incident.title}`));
    lines.push(chalk.white(`     Severity: ${severityColor(incident.severity.toUpperCase())}`));
    lines.push(chalk.white(`     Status: ${incident.status}`));
    lines.push(chalk.white(`     Root Cause: ${incident.rootCause}`));
    
    if (incident.resolutionTime > 0) {
      lines.push(chalk.white(`     Resolution Time: ${incident.resolutionTime} minutes`));
    }
  }
  
  // 建议
  lines.push(chalk.blue.bold('\n💡 Recommendations'));
  for (let i = 0; i < data.recommendations.length; i++) {
    lines.push(chalk.white(`  ${i + 1}. ${data.recommendations[i]}`));
  }
  
  lines.push(chalk.blue.bold(`\n${'='.repeat(60)}\n`));
  
  return lines.join('\n');
}

export const reportCommand = new Command('report')
  .description('Generate analysis reports')
  .option('-f, --format <format>', 'Output format (text, json, html, markdown)', 'text')
  .option('-o, --output <file>', 'Output file path')
  .option('-t, --timeframe <days>', 'Timeframe in days', '7')
  .option('--mock', 'Use mock data for demonstration', false)
  .action(async (options) => {
    try {
      logger.info('Generating report...');
      
      // 获取报告数据
      let reportData: ReportData;
      
      if (options.mock) {
        reportData = generateMockReportData();
      } else {
        // 在实际应用中，这里会从数据库或API获取数据
        console.log(chalk.yellow('No data source configured. Use --mock for demonstration.'));
        process.exit(1);
      }
      
      // 生成报告
      let output: string;
      
      switch (options.format) {
        case 'json':
          output = JSON.stringify(reportData, null, 2);
          break;
        
        case 'markdown':
          output = generateMarkdownReport(reportData);
          break;
        
        case 'html':
          output = generateHtmlReport(reportData);
          break;
        
        case 'text':
        default:
          output = formatTextReport(reportData);
          break;
      }
      
      // 输出报告
      if (options.output) {
        // 写入文件
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output, 'utf-8');
        console.log(chalk.green(`✅ Report saved to: ${outputPath}`));
      } else {
        // 输出到控制台
        if (options.format === 'text') {
          console.log(output);
        } else {
          console.log(output);
        }
      }
      
      logger.info('Report generation completed');
      
    } catch (error) {
      logger.error(`Report command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (process.env.LOG_LEVEL === 'debug') {
        console.error(error);
      }
      
      process.exit(1);
    }
  });

/**
 * 生成Markdown报告
 */
function generateMarkdownReport(data: ReportData): string {
  const lines: string[] = [];
  
  lines.push(`# ${data.title}`);
  lines.push(`\n*Generated: ${data.timestamp}*\n`);
  
  lines.push('## Executive Summary');
  lines.push(`- **Total Incidents:** ${data.summary.totalIncidents}`);
  lines.push(`- **Resolved:** ${data.summary.resolvedIncidents}`);
  lines.push(`- **Avg Resolution Time:** ${data.summary.averageResolutionTime} minutes`);
  
  lines.push('\n### Top Root Causes');
  for (const cause of data.summary.topRootCauses) {
    lines.push(`- ${cause}`);
  }
  
  lines.push('\n## Key Metrics');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| MTTR | ${data.metrics.mttr} minutes |`);
  lines.push(`| MTBF | ${data.metrics.mtbf} hours |`);
  lines.push(`| Availability | ${data.metrics.availability}% |`);
  lines.push(`| Error Rate | ${data.metrics.errorRate}% |`);
  
  lines.push('\n## Incident Details');
  for (const incident of data.incidents) {
    lines.push(`\n### ${incident.id}: ${incident.title}`);
    lines.push(`- **Severity:** ${incident.severity}`);
    lines.push(`- **Status:** ${incident.status}`);
    lines.push(`- **Root Cause:** ${incident.rootCause}`);
    if (incident.resolutionTime > 0) {
      lines.push(`- **Resolution Time:** ${incident.resolutionTime} minutes`);
    }
  }
  
  lines.push('\n## Recommendations');
  for (let i = 0; i < data.recommendations.length; i++) {
    lines.push(`${i + 1}. ${data.recommendations[i]}`);
  }
  
  return lines.join('\n');
}

/**
 * 生成HTML报告
 */
function generateHtmlReport(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #2563eb; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metric { display: inline-block; background: white; padding: 15px; margin: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .metric-label { font-size: 14px; color: #6b7280; }
    .incident { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
    .severity-critical { border-left-color: #ef4444; }
    .severity-high { border-left-color: #f59e0b; }
    .severity-medium { border-left-color: #3b82f6; }
    .severity-low { border-left-color: #6b7280; }
    .status-resolved { color: #10b981; }
    .status-investigating { color: #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; }
    .recommendations { background: #f0f9ff; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${data.title}</h1>
  <p><em>Generated: ${data.timestamp}</em></p>
  
  <div class="summary">
    <h2>Executive Summary</h2>
    <p><strong>Total Incidents:</strong> ${data.summary.totalIncidents}</p>
    <p><strong>Resolved:</strong> ${data.summary.resolvedIncidents}</p>
    <p><strong>Avg Resolution Time:</strong> ${data.summary.averageResolutionTime} minutes</p>
    
    <h3>Top Root Causes</h3>
    <ul>
      ${data.summary.topRootCauses.map(cause => `<li>${cause}</li>`).join('\n      ')}
    </ul>
  </div>
  
  <h2>Key Metrics</h2>
  <div>
    <div class="metric">
      <div class="metric-value">${data.metrics.mttr}</div>
      <div class="metric-label">MTTR (minutes)</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.metrics.mtbf}</div>
      <div class="metric-label">MTBF (hours)</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.metrics.availability}%</div>
      <div class="metric-label">Availability</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.metrics.errorRate}%</div>
      <div class="metric-label">Error Rate</div>
    </div>
  </div>
  
  <h2>Incident Details</h2>
  ${data.incidents.map(incident => `
  <div class="incident severity-${incident.severity}">
    <h3>${incident.id}: ${incident.title}</h3>
    <p><strong>Severity:</strong> ${incident.severity.toUpperCase()}</p>
    <p><strong>Status:</strong> <span class="status-${incident.status}">${incident.status}</span></p>
    <p><strong>Root Cause:</strong> ${incident.rootCause}</p>
    ${incident.resolutionTime > 0 ? `<p><strong>Resolution Time:</strong> ${incident.resolutionTime} minutes</p>` : ''}
  </div>
  `).join('\n')}
  
  <div class="recommendations">
    <h2>Recommendations</h2>
    <ol>
      ${data.recommendations.map(rec => `<li>${rec}</li>`).join('\n      ')}
    </ol>
  </div>
</body>
</html>`;
}