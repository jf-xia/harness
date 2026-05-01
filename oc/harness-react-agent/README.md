# Harness AI SRE Agent

基于ReAct架构的AI代理CLI工具，模拟Harness AI SRE的核心功能。

## 功能特性

- **AI Scribe Agent**: 监控通信渠道，自动记录关键事件和决策
- **RCA Change Agent**: 分析事件时间线，关联变更事件，生成根因分析理论
- **ReAct引擎**: 实现推理-行动-观察循环
- **CLI工具**: 完整的命令行界面
- **TypeScript**: 完全类型安全的实现

## 架构设计

本项目采用ReAct（Reasoning + Acting）架构，这是一种结合推理和行动的AI代理架构：

```
思考（Thought）→ 行动（Action）→ 观察（Observation）→ 思考（Thought）→ ...
```

### 核心组件

1. **BaseAgent**: 基础代理类，提供ReAct循环的基础实现
2. **ScribeAgent**: AI Scribe Agent，负责监控和记录
3. **RCAChangeAgent**: RCA Change Agent，负责根因分析
4. **ReactEngine**: ReAct引擎，管理代理的执行循环

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行演示

```bash
# 运行完整演示
npx ts-node examples/demo.ts

# 或者使用CLI
npm start -- start --mock
```

### 运行测试

```bash
npm test
```

### 构建项目

```bash
npm run build
```

## CLI命令

### 启动代理

```bash
# 启动所有代理
harness-agent start --agents scribe,rca --mock

# 只启动Scribe Agent
harness-agent start --agents scribe --mock

# 设置最大步数和超时
harness-agent start --steps 10 --timeout 60000
```

### 分析事件

```bash
# 分析特定事件
harness-agent analyze INC-123 --mock

# 使用JSON格式输出
harness-agent analyze INC-123 --output json --mock
```

### 生成报告

```bash
# 生成文本报告
harness-agent report --mock

# 生成JSON报告
harness-agent report --format json --mock

# 生成HTML报告并保存到文件
harness-agent report --format html --output report.html --mock
```

### 配置管理

```bash
# 显示配置
harness-agent config show

# 设置配置值
harness-agent config set app.logLevel debug

# 获取配置值
harness-agent config get harness.apiUrl

# 重置配置
harness-agent config reset
```

## 项目结构

```
harness-react-agent/
├── src/
│   ├── agents/          # 代理实现
│   │   ├── base-agent.ts
│   │   ├── scribe-agent.ts
│   │   └── rca-agent.ts
│   ├── core/            # 核心架构
│   │   └── react-engine.ts
│   ├── cli/             # CLI命令
│   │   ├── index.ts
│   │   └── commands/
│   ├── types/           # 类型定义
│   └── utils/           # 工具函数
├── examples/            # 示例代码
├── tests/               # 测试文件
├── docs/                # 学习文档
└── config/              # 配置文件
```

## 学习资源

### 文档

- [学习计划](docs/00-学习计划.md)
- [Harness平台概述](docs/01-Harness平台概述.md)
- [AI代理基础](docs/02-AI代理基础.md)
- [ReAct架构原理](docs/03-ReAct架构原理.md)
- [Harness AI SRE代理架构](docs/04-Harness-AI-SRE代理架构.md)
- [TypeScript CLI开发基础](docs/05-TypeScript-CLI开发基础.md)
- [项目结构设计](docs/06-项目结构设计.md)

### 相关资源

- [Harness官方文档](https://developer.harness.io/docs/ai-sre)
- [ReAct论文](https://arxiv.org/abs/2210.03629)
- [TypeScript文档](https://www.typescriptlang.org/)

## 开发指南

### 添加新代理

1. 继承`BaseAgent`类
2. 实现`perceive`、`reason`、`act`、`observe`方法
3. 在CLI中注册新代理

### 扩展功能

1. 添加新的CLI命令
2. 集成外部API
3. 实现新的分析算法

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 致谢

- [Harness](https://harness.io/) - AI驱动的DevOps平台
- [ReAct](https://arxiv.org/abs/2210.03629) - 推理和行动架构
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的JavaScript