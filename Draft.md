# Draft

我想要学习如何构建像Claude Code这样的AI Agent, 具体来说是如何通过 Harness Engineering 这种新的让 AI 从“会聊天”变为“能干活”的方法, Claude Code 是目前最成熟的落地实践之一。首先跟我讨论计划，以及必要的知识点写到doc/*.md中

技术选型：
  Bun          → 快速启动（4x faster than Node.js），原生 TS 支持
  TypeScript   → 不用类型系统约等于自杀
  React + Ink  → 声明式终端 UI，复杂状态管理
  Commander.js → CLI 参数解析（Node 生态最成熟的）
  Zod          → 运行时数据校验 + 自动生成 JSON Schema
  ripgrep      → Rust 写的搜索引擎（GrepTool 直接调二进制）
  @anthropic-ai/sdk

## 目录结构

### 入口与 UI

src/screens/          → React 页面（REPL 主界面、Onboarding 引导、Doctor 诊断）
src/components/       → UI 组件（权限弹窗、工具执行进度、diff 预览）
src/commands/         → 斜杠命令（/commit、/compact、/model、/review）

### 引擎

src/query.ts          → 核心 agentic loop，while(true) 循环

```ts
// src/query.ts (简化版，保留核心逻辑)
async function* queryLoop(params: QueryLoopParams) {
  let state = {
    messages: params.initialMessages,
    turnCount: 1,
    outputTokenRecoveryCount: 0,
  }

  while (true) {
    // 1. 构造上下文
    const systemPrompt = buildSystemPrompt(params)
    const messagesForApi = maybeCompressHistory(state.messages)

    // 2. 调 API（流式）
    const stream = createMessageStream({
      model: params.model,
      system: systemPrompt,
      messages: messagesForApi,
      tools: params.toolDefinitions,
      max_tokens: calculateMaxTokens(state),
    })

    // 3. 处理流式响应
    const response = await processStreamEvents(stream)

    // 4. 有工具调用？执行它们
    if (response.toolUses.length > 0) {
      const results = await executeToolCalls(response.toolUses, params.toolContext)
      state.messages.push(response.assistantMessage)
      state.messages.push(...results.map(toToolResultMessage))
      state.turnCount++
      continue  // → 回到 while(true) 顶部
    }

    // 5. 没有工具调用 = LLM 说完了
    state.messages.push(response.assistantMessage)
    return  // 退出循环
  }
}
```

src/QueryEngine.ts    → 会话状态管理器，一个对话一个实例

### 工具

src/tools/BashTool/        → 最复杂的单个工具
src/tools/FileEditTool/    → 搜索替换编辑
src/tools/FileReadTool/    → 文件读取
src/tools/GrepTool/        → ripgrep 封装
src/tools/GlobTool/        → 文件模式匹配
src/tools/WebFetchTool/    → 网页内容抓取
src/tools/WebSearchTool/   → 网页搜索

### 其他

src/memdir/           → 记忆系统（跨会话持久化）

## 设计哲学

1. 状态外化。 QueryEngine 的所有外部依赖通过 QueryEngineConfig（20+ 个字段）注入，不在内部 import。这意味着你可以在单测里传一个 mock 的工具列表和 API 客户端进去，不用启动整个应用。

2. 渐进式复杂度。 简单的事保持简单。FileReadTool 只有几十行；BashTool 有 1143 行。不是每个工具都需要同样的复杂度，复杂度应该在需要的地方集中。

3. 优雅降级。 API 超时重试（指数退避，最多 5 次）。模型不支持 stream_options 就去掉这个参数重试。子 Agent 崩溃不影响主循环。输出撞到 max_output_tokens 限制自动重试最多 3 次。

4. 类型即文档。 Zod schema 同时做验证和类型推导。ToolDef 类型里的字段名就是最准确的接口文档。新来的人看类型定义就知道一个工具需要实现哪些方法。

5. 上下文经济学。 token 就是钱。工具输出超过阈值写磁盘，只在上下文里留摘要。上下文有四层压缩。getToolUseSummary() 方法为每个工具定义了压缩时的摘要策略。

6. 声明式配置。 工具、命令、Skill、Agent 类型全是声明式的。Skill 就是一个 .md 文件加 YAML frontmatter。Agent 类型是一个配置对象。运行时按需组装，不需要在代码里注册。
