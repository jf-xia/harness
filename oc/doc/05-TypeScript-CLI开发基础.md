# TypeScript CLI开发基础

## 什么是CLI
CLI（Command Line Interface）是用户与计算机程序交互的文本界面。在TypeScript中，我们可以使用各种库来构建功能强大的CLI工具。

## TypeScript高级特性

### 1. 高级类型

#### 联合类型
```typescript
type StringOrNumber = string | number;
```

#### 交叉类型
```typescript
type HasName = { name: string };
type HasAge = { age: number };
type Person = HasName & HasAge;
```

#### 类型守卫
```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

#### 条件类型
```typescript
type IsString<T> = T extends string ? true : false;
```

#### 映射类型
```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

### 2. 泛型

#### 基本泛型
```typescript
function identity<T>(arg: T): T {
  return arg;
}
```

#### 泛型约束
```typescript
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(arg: T): T {
  console.log(arg.length);
  return arg;
}
```

#### 泛型工具类型
```typescript
// Partial - 所有属性可选
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Required - 所有属性必需
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Pick - 选择部分属性
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit - 排除部分属性
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

### 3. 装饰器

#### 类装饰器
```typescript
function logged(constructor: Function) {
  console.log(`Creating instance of ${constructor.name}`);
}

@logged
class MyClass {
  constructor() {
    console.log('Instance created');
  }
}
```

#### 方法装饰器
```typescript
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${key} with args: ${JSON.stringify(args)}`);
    const result = originalMethod.apply(this, args);
    console.log(`Result: ${JSON.stringify(result)}`);
    return result;
  };
  
  return descriptor;
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b;
  }
}
```

## CLI框架

### 1. Commander.js
最流行的Node.js CLI框架。

#### 基本用法
```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('my-cli')
  .description('My CLI tool')
  .version('1.0.0');

program
  .command('greet')
  .description('Greet a user')
  .argument('<name>', 'Name to greet')
  .option('-u, --uppercase', 'Use uppercase')
  .action((name, options) => {
    let greeting = `Hello, ${name}!`;
    if (options.uppercase) {
      greeting = greeting.toUpperCase();
    }
    console.log(greeting);
  });

program.parse();
```

#### 高级特性
```typescript
// 子命令
program
  .command('config')
  .description('Manage configuration')
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action((key, value) => {
        // 设置配置
      })
  );

// 交互式输入
import inquirer from 'inquirer';

program
  .command('init')
  .description('Initialize project')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
      },
      {
        type: 'list',
        name: 'template',
        message: 'Template:',
        choices: ['typescript', 'javascript', 'python'],
      },
    ]);
    
    console.log(answers);
  });
```

### 2. Ink.js
用于构建CLI界面的React框架。

#### 基本用法
```tsx
import React, { useState } from 'react';
import { render, Text, Box, useInput } from 'ink';

const Counter = () => {
  const [count, setCount] = useState(0);
  
  useInput((input, key) => {
    if (input === '+') {
      setCount(count + 1);
    } else if (input === '-') {
      setCount(count - 1);
    }
  });
  
  return (
    <Box flexDirection="column">
      <Text>Count: {count}</Text>
      <Text>Press + or - to change count</Text>
    </Box>
  );
};

render(<Counter />);
```

#### 高级组件
```tsx
import React, { useState, useEffect } from 'react';
import { render, Text, Box, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  
  useEffect(() => {
    setTimeout(() => setLoading(false), 2000);
  }, []);
  
  if (loading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading...</Text>
      </Box>
    );
  }
  
  const items = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ];
  
  return (
    <Box flexDirection="column">
      <Text>Select an option:</Text>
      <SelectInput items={items} onSelect={(item) => setSelected(item.value)} />
      {selected && <Text>Selected: {selected}</Text>}
    </Box>
  );
};

render(<App />);
```

## 错误处理

### 1. 自定义错误类
```typescript
class CLIError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

class ValidationError extends CLIError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 1);
    this.name = 'ValidationError';
  }
}
```

### 2. 错误处理中间件
```typescript
function handleError(error: Error): void {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  } else {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);
```

## 日志记录

### 1. 日志级别
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}
  
  debug(message: string): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }
  
  info(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`);
    }
  }
  
  warn(message: string): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`);
    }
  }
  
  error(message: string): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`);
    }
  }
}
```

### 2. 彩色输出
```typescript
import chalk from 'chalk';

console.log(chalk.green('Success!'));
console.log(chalk.red('Error!'));
console.log(chalk.yellow('Warning!'));
console.log(chalk.blue('Info!'));
```

## 配置管理

### 1. 配置文件
```typescript
import Conf from 'conf';

const config = new Conf({
  defaults: {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3,
  },
});

// 获取配置
const apiUrl = config.get('apiUrl');

// 设置配置
config.set('timeout', 10000);

// 删除配置
config.delete('retries');
```

### 2. 环境变量
```typescript
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.API_KEY;
const environment = process.env.NODE_ENV || 'development';
```

## 测试

### 1. 单元测试
```typescript
import { expect, test, describe } from 'vitest';

describe('Calculator', () => {
  test('adds two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
  
  test('subtracts two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });
});
```

### 2. 集成测试
```typescript
import { execa } from 'execa';

test('CLI shows help', async () => {
  const { stdout } = await execa('node', ['dist/cli.js', '--help']);
  expect(stdout).toContain('Usage:');
});
```

## 打包和发布

### 1. 使用tsup打包
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

### 2. package.json配置
```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "ink": "^4.0.0",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "tsup": "^7.0.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
```

## 学习资源

### 1. 官方文档
- [TypeScript官方文档](https://www.typescriptlang.org/)
- [Commander.js文档](https://github.com/tj/commander.js#readme)
- [Ink.js文档](https://github.com/vadimdemedes/ink#readme)

### 2. 教程
- [Building CLI Tools with Node.js](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### 3. 示例项目
- [CLI样板项目](https://github.com/sindresorhus/cli-boilerplate)
- [Ink示例](https://github.com/vadimdemedes/ink#examples)

## 下一步

掌握TypeScript CLI开发基础后，下一步是设计和实现ReAct代理架构。