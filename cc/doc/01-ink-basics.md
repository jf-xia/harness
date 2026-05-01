# Ink 基础 — React for CLI

## 什么是 Ink
Ink 是一个用 React 组件模型构建 CLI 界面的框架。它把 React 的声明式 UI 带入终端。

```
React (DOM) → 浏览器
React (Ink) → 终端
```

## 核心概念

### 1. 渲染原理
Ink 使用 Yoga 布局引擎（Facebook 的跨平台 Flexbox 实现），将 React 组件树转换为终端输出。

```
JSX → React 组件树 → Yoga 布局 → 终端字符串
```

关键区别：
- 浏览器 React: reconciler → DOM
- Ink: reconciler → Yoga → 终端 ANSI

### 2. 基础组件

```tsx
import { render, Box, Text } from 'ink';

// Box = div（Flex 容器）
// Text = span（文本节点）
function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>Hello</Text>
      <Text dimColor>World</Text>
    </Box>
  );
}

render(<App />);
```

### 3. Props 对照

| 网页 CSS | Ink Box Props | 说明 |
|----------|---------------|------|
| display: flex | 默认就是 flex | Box 天生是 flex 容器 |
| flex-direction | flexDirection | 排列方向 |
| padding | padding / paddingLeft... | 内边距 |
| border | borderStyle | 边框样式 |
| width | width | 支持数字或百分比 |

### 4. 状态管理

```tsx
import { useState, useEffect } from 'react';
import { render, Text } from 'ink';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(timer);  // 清理很重要！
  }, []);

  return <Text>Count: {count}</Text>;
}
```

**关键点**: useEffect 的清理函数在终端环境下尤为重要，否则退出后进程不会结束。

### 5. 用户输入

```tsx
import { useInput, useApp } from 'ink';

function App() {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q') exit();
    if (key.return) console.log('Enter pressed');
    if (key.ctrl && input === 'c') exit();
  });

  return <Text>Press 'q' to quit</Text>;
}
```

### 6. 子进程与终端

```tsx
import { execa } from 'execa';
import { useState, useEffect } from 'react';

function GitStatus() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    execa('git', ['status', '--short']).then(({ stdout }) => {
      setStatus(stdout);
    });
  }, []);

  return <Text>{status}</Text>;
}
```

## 项目初始化

```bash
pnpm init
pnpm add ink @inkjs/ui-kit react
pnpm add -D @types/react typescript tsx
```

tsconfig.json 关键配置:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",        // 使用 React 17+ JSX 转换
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

package.json:
```json
{
  "scripts": {
    "dev": "tsx src/index.tsx"
  }
}
```

## 第一个示例: Hello Harness

```tsx
// src/index.tsx
import React from 'react';
import { render, Box, Text } from 'ink';

function App() {
  return (
    <Box flexDirection="column" padding={1} borderStyle="round">
      <Text bold color="cyan">⚡ Harness CLI</Text>
      <Text dimColor>Type 'help' to get started</Text>
    </Box>
  );
}

render(<App />);
```

## 下一步
→ 组件模式与状态管理 (02-component-patterns.md)
