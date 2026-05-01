# 实现总览

## 已完成的模块

```
src/
├── index.tsx                 # 入口
├── app.tsx                   # 主应用组件 (组装所有模块)
├── types.ts                  # 共享类型定义
├── agent/
│   ├── context.ts            # 上下文管理器 (token 追踪 + 自动裁剪)
│   └── loop.ts               # Agent 主循环 (API 调用 + 工具执行)
├── tools/
│   ├── registry.ts           # 工具注册表
│   ├── read-file.ts          # 读取文件
│   ├── write-file.ts         # 写入文件
│   ├── bash.ts               # 执行 shell 命令
│   └── glob.ts               # 文件搜索
├── permissions/
│   └── manager.ts            # 权限管理 (allow/deny/ask 规则)
└── components/
    ├── Header.tsx            # 顶部标题栏
    ├── Message.tsx           # 单条消息渲染
    ├── MessageList.tsx       # 消息列表 (自动滚动)
    ├── PromptInput.tsx       # 输入框
    └── PermissionDialog.tsx  # 权限确认对话框
```

## 数据流

```
用户输入
  ↓
PromptInput → App.handleSubmit
  ↓
AgentLoop.run(userMessage)
  ↓
ContextManager.addMessage('user', text)
  ↓
Anthropic API (messages.create)
  ↓
响应处理:
  ├─ text → onEvent('text') → UI 更新
  └─ tool_use → executeTool → onEvent('tool_result') → UI 更新
       ↓
  权限检查 (PermissionManager)
       ↓
  工具执行 (Tool.execute)
       ↓
  结果返回 → 继续循环
  ↓
done → 等待下一次用户输入
```

## 使用方式

```bash
# 设置 API Key
export ANTHROPIC_API_KEY=sk-ant-...

# 启动
npm run dev
```

## 特性

- **流式消息渲染** — 支持文本流式输出
- **工具调用** — 内置 4 个工具 (read_file, write_file, bash, glob)
- **权限管理** — 工具执行前检查权限，支持 allow/deny/ask 规则
- **上下文管理** — 自动追踪 token 数，超出时裁剪旧消息
- **命令** — /quit, /exit, /clear

## 下一步改进方向

1. 流式 API (stream) 替代非流式调用
2. 更多工具 (edit_file, grep, web_search)
3. 摘要压缩策略
4. 多轮工具调用并行执行
5. 配置文件自定义 (model, system prompt, permissions)
