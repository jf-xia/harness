# Agent Harness 学习路线

## 目标
从零构建一个完整的 Agent Harness 框架，类似 Claude Code 的核心架构。

## 学习阶段

### Phase 1: Ink 基础 — React CLI 模型
**核心概念**: 用 React 组件模型构建 CLI 界面
- Ink 框架原理（React → 终端渲染）
- 组件组合与 Props
- useState / useEffect 在 CLI 中的应用
- 用户输入处理（useInput, TextInput）
- 布局系统（Box, Text）

**产出**: 一个交互式 CLI 应用

### Phase 2: 组件模式与状态管理
**核心概念**: 复杂 CLI 界面的架构
- 自定义 Hook 设计
- Context 跨组件状态共享
- 消息列表渲染（类似聊天界面）
- 加载状态与流式输出

**产出**: 一个带消息流的聊天界面

### Phase 3: 工具系统
**核心概念**: Agent 的能力扩展
- 工具定义（JSON Schema）
- 工具注册与发现
- 工具执行管线
- 结果处理与错误恢复

**产出**: 可注册和调用工具的系统

### Phase 4: 上下文管理
**核心概念**: Agent 的记忆系统
- 对话历史管理
- 上下文窗口（Token 计算与截断）
- 系统提示词管理
- 压缩与摘要策略

**产出**: 带上下文管理的对话系统

### Phase 5: 权限系统
**核心概念**: 安全与用户控制
- 权限模型设计（allow/deny/ask）
- 工具权限检查
- 权限持久化（settings.json）
- 沙箱与安全边界

**产出**: 带权限控制的工具执行

### Phase 6: 完整 Harness
**核心概念**: 组装所有模块
- Agent 主循环（消息 → 工具 → 响应）
- 流式 API 集成
- Hook 系统（事件驱动扩展）
- 配置管理

**产出**: 一个完整的 Agent Harness 框架

## 技术栈
| 用途 | 技术 |
|------|------|
| 语言 | TypeScript |
| CLI 框架 | Ink (React for CLI) |
| 包管理 | pnpm |
| 构建 | tsx (直接运行 TS) |
| API | Anthropic SDK (@anthropic-ai/sdk) |

## 项目结构（目标）
```
cc/
├── doc/                  # 学习文档
├── src/
│   ├── components/       # Ink 组件
│   ├── tools/            # 工具系统
│   ├── context/          # 上下文管理
│   ├── permissions/      # 权限系统
│   ├── agent/            # Agent 核心循环
│   └── index.tsx         # 入口
├── package.json
└── tsconfig.json
```
