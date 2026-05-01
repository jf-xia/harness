# 工具系统

## 设计理念

工具是 Agent 的手和脚。一个好的工具系统需要：
1. **声明式定义** — 用 JSON Schema 描述工具的能力
2. **统一接口** — 所有工具遵循相同的调用约定
3. **安全执行** — 工具执行前经过权限检查
4. **结果标准化** — 统一的返回格式

## 工具定义

```typescript
// types.ts
interface ToolDefinition {
  name: string;                    // 唯一标识
  description: string;             // 给 LLM 看的描述
  inputSchema: JSONSchema;         // 参数的 JSON Schema
  permissions?: Permission[];      // 需要的权限
}

interface ToolResult {
  output: string;                  // 文本输出
  error?: string;                  // 错误信息
  metadata?: Record<string, any>;  // 附加数据
}

interface Tool {
  definition: ToolDefinition;
  execute: (input: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}
```

## 工具注册

```typescript
// tool-registry.ts
class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool ${tool.definition.name} already registered`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  // 生成给 LLM 的工具列表
  toAPITools(): Anthropic.Tool[] {
    return this.getAll().map(t => ({
      name: t.definition.name,
      description: t.definition.description,
      input_schema: t.definition.inputSchema,
    }));
  }
}
```

## 内置工具示例

### 1. 文件读取

```typescript
const ReadFileTool: Tool = {
  definition: {
    name: 'read_file',
    description: 'Read the contents of a file at the given path',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        offset: { type: 'number', description: 'Line number to start from' },
        limit: { type: 'number', description: 'Number of lines to read' },
      },
      required: ['path'],
    },
    permissions: [{ type: 'read', scope: 'filesystem' }],
  },
  async execute(input, context) {
    const content = await fs.readFile(input.path, 'utf-8');
    const lines = content.split('\n');
    const start = input.offset || 0;
    const end = input.limit ? start + input.limit : lines.length;
    return { output: lines.slice(start, end).join('\n') };
  },
};
```

### 2. Shell 执行

```typescript
const BashTool: Tool = {
  definition: {
    name: 'bash',
    description: 'Execute a shell command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to execute' },
      },
      required: ['command'],
    },
    permissions: [{ type: 'execute', scope: 'shell' }],
  },
  async execute(input, context) {
    // 权限检查
    const allowed = await context.checkPermission('shell', input.command);
    if (!allowed) {
      return { output: '', error: 'Permission denied' };
    }

    try {
      const { stdout, stderr } = await execaCommand(input.command, {
        timeout: 30000,
        cwd: context.workingDirectory,
      });
      return { output: stdout + (stderr ? `\n[stderr]: ${stderr}` : '') };
    } catch (err: any) {
      return { output: err.stdout || '', error: err.message };
    }
  },
};
```

## 工具执行管线

```
LLM 返回 tool_use
       ↓
  解析工具名和参数
       ↓
  查找注册的工具
       ↓
  权限检查 ←── deny → 返回错误
       ↓ allow / ask → 用户确认
  执行工具
       ↓
  格式化结果
       ↓
  追加到消息历史
       ↓
  发送给 LLM 继续
```

```typescript
async function executeToolCall(
  toolUse: Anthropic.ToolUseBlock,
  registry: ToolRegistry,
  context: ToolContext,
): Promise<Anthropic.ToolResultBlockParam> {
  const tool = registry.get(toolUse.name);
  if (!tool) {
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: `Error: Unknown tool "${toolUse.name}"`,
      is_error: true,
    };
  }

  // 权限检查
  if (tool.definition.permissions) {
    for (const perm of tool.definition.permissions) {
      const granted = await context.requestPermission(perm, toolUse.input);
      if (!granted) {
        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'Error: Permission denied by user',
          is_error: true,
        };
      }
    }
  }

  // 执行
  const result = await tool.execute(toolUse.input, context);

  return {
    type: 'tool_result',
    tool_use_id: toolUse.id,
    content: result.error || result.output,
    is_error: !!result.error,
  };
}
```

## 下一步
→ 上下文管理 (04-context-management.md)
