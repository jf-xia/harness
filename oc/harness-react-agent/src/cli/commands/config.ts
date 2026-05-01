/**
 * Config命令 - 配置管理
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Conf from 'conf';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ConfigCommand', 'info');

// 配置schema
const configSchema = {
  app: {
    type: 'object',
    properties: {
      name: { type: 'string', default: 'harness-agent' },
      logLevel: { type: 'string', default: 'info', enum: ['debug', 'info', 'warn', 'error'] },
      debug: { type: 'boolean', default: false },
    },
  },
  agents: {
    type: 'object',
    properties: {
      defaultMaxSteps: { type: 'number', default: 10 },
      defaultTimeout: { type: 'number', default: 60000 },
      enableTracing: { type: 'boolean', default: true },
    },
  },
  harness: {
    type: 'object',
    properties: {
      apiUrl: { type: 'string', default: 'https://app.harness.io' },
      apiKey: { type: 'string' },
      accountId: { type: 'string' },
      orgId: { type: 'string' },
      projectId: { type: 'string' },
    },
  },
  integrations: {
    type: 'object',
    properties: {
      slack: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: false },
          botToken: { type: 'string' },
          channels: { type: 'array', default: ['general'] },
        },
      },
      github: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: false },
          token: { type: 'string' },
          owner: { type: 'string' },
          repo: { type: 'string' },
        },
      },
    },
  },
};

// 创建配置实例
const config = new Conf({
  projectName: 'harness-agent',
  schema: configSchema,
  defaults: {
    app: {
      name: 'harness-agent',
      logLevel: 'info',
      debug: false,
    },
    agents: {
      defaultMaxSteps: 10,
      defaultTimeout: 60000,
      enableTracing: true,
    },
    harness: {
      apiUrl: 'https://app.harness.io',
    },
    integrations: {
      slack: {
        enabled: false,
        channels: ['general'],
      },
      github: {
        enabled: false,
      },
    },
  },
});

export const configCommand = new Command('config')
  .description('Manage configuration');

// 显示配置
configCommand
  .command('show')
  .description('Show current configuration')
  .option('-p, --path <path>', 'Show specific config path')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .action((options) => {
    try {
      let configData: any;
      
      if (options.path) {
        configData = config.get(options.path);
        if (configData === undefined) {
          console.log(chalk.yellow(`Config path '${options.path}' not found`));
          return;
        }
      } else {
        configData = config.store;
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify(configData, null, 2));
      } else {
        console.log(chalk.blue.bold('\n📋 Configuration:\n'));
        printConfig(configData, '  ');
        console.log('');
      }
      
    } catch (error) {
      logger.error(`Failed to show config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 设置配置
configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key (e.g., app.logLevel)')
  .argument('<value>', 'Configuration value')
  .action((key, value) => {
    try {
      // 尝试解析值类型
      let parsedValue: any = value;
      
      if (value === 'true') {
        parsedValue = true;
      } else if (value === 'false') {
        parsedValue = false;
      } else if (/^\d+$/.test(value)) {
        parsedValue = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        parsedValue = parseFloat(value);
      } else if (value.startsWith('[') || value.startsWith('{')) {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // 保持字符串
        }
      }
      
      config.set(key, parsedValue);
      console.log(chalk.green(`✅ Set ${key} = ${JSON.stringify(parsedValue)}`));
      
    } catch (error) {
      logger.error(`Failed to set config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 获取配置
configCommand
  .command('get')
  .description('Get a configuration value')
  .argument('<key>', 'Configuration key')
  .action((key) => {
    try {
      const value = config.get(key);
      
      if (value === undefined) {
        console.log(chalk.yellow(`Config key '${key}' not found`));
        return;
      }
      
      if (typeof value === 'object') {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(value);
      }
      
    } catch (error) {
      logger.error(`Failed to get config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 删除配置
configCommand
  .command('delete')
  .description('Delete a configuration value')
  .argument('<key>', 'Configuration key')
  .action((key) => {
    try {
      if (!config.has(key)) {
        console.log(chalk.yellow(`Config key '${key}' not found`));
        return;
      }
      
      config.delete(key);
      console.log(chalk.green(`✅ Deleted ${key}`));
      
    } catch (error) {
      logger.error(`Failed to delete config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 重置配置
configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    try {
      if (!options.yes) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset all configuration to defaults?',
            default: false,
          },
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('Reset cancelled'));
          return;
        }
      }
      
      config.clear();
      console.log(chalk.green('✅ Configuration reset to defaults'));
      
    } catch (error) {
      logger.error(`Failed to reset config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 导出配置
configCommand
  .command('export')
  .description('Export configuration')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      const configData = JSON.stringify(config.store, null, 2);
      
      if (options.output) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const outputPath = path.resolve(options.output);
        
        await fs.writeFile(outputPath, configData, 'utf-8');
        console.log(chalk.green(`✅ Configuration exported to: ${outputPath}`));
      } else {
        console.log(configData);
      }
      
    } catch (error) {
      logger.error(`Failed to export config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 导入配置
configCommand
  .command('import')
  .description('Import configuration')
  .argument('<file>', 'Configuration file path')
  .option('-m, --merge', 'Merge with existing config', false)
  .action(async (file, options) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.resolve(file);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const importedConfig = JSON.parse(content);
      
      if (options.merge) {
        const existingConfig = config.store;
        const mergedConfig = deepMerge(existingConfig, importedConfig);
        config.store = mergedConfig;
        console.log(chalk.green('✅ Configuration merged'));
      } else {
        config.store = importedConfig;
        console.log(chalk.green('✅ Configuration imported'));
      }
      
    } catch (error) {
      logger.error(`Failed to import config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// 验证配置
configCommand
  .command('validate')
  .description('Validate configuration')
  .action(() => {
    try {
      const errors: string[] = [];
      
      // 验证必需字段
      const harnessConfig = config.get('harness') as any;
      if (!harnessConfig?.apiUrl) {
        errors.push('harness.apiUrl is required');
      }
      
      // 验证数值范围
      const agentsConfig = config.get('agents') as any;
      if (agentsConfig?.defaultMaxSteps && (agentsConfig.defaultMaxSteps < 1 || agentsConfig.defaultMaxSteps > 100)) {
        errors.push('agents.defaultMaxSteps must be between 1 and 100');
      }
      
      if (agentsConfig?.defaultTimeout && (agentsConfig.defaultTimeout < 1000 || agentsConfig.defaultTimeout > 300000)) {
        errors.push('agents.defaultTimeout must be between 1000 and 300000');
      }
      
      if (errors.length > 0) {
        console.log(chalk.red.bold('\n❌ Configuration validation failed:\n'));
        for (const error of errors) {
          console.log(chalk.red(`  • ${error}`));
        }
        console.log('');
        process.exit(1);
      } else {
        console.log(chalk.green.bold('\n✅ Configuration is valid\n'));
      }
      
    } catch (error) {
      logger.error(`Failed to validate config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * 打印配置对象
 */
function printConfig(obj: any, indent: string = ''): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(chalk.blue(`${indent}${key}:`));
      printConfig(value, indent + '  ');
    } else {
      console.log(chalk.white(`${indent}${key}: ${JSON.stringify(value)}`));
    }
  }
}

/**
 * 深度合并对象
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}