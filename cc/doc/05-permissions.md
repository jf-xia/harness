# 权限系统

## 设计原则

1. **最小权限** — 默认拒绝，显式授予
2. **分级控制** — 读取宽松，写入/执行严格
3. **用户确认** — 敏感操作需要用户同意
4. **持久化** — 用户选择可以保存，避免重复询问

## 权限模型

```typescript
type PermissionAction = 'allow' | 'deny' | 'ask';

interface PermissionRule {
  pattern: string;         // 匹配模式 (glob 或正则)
  action: PermissionAction;
  scope: PermissionScope;
}

type PermissionScope =
  | 'read'       // 读取文件
  | 'write'      // 写入文件
  | 'execute'    // 执行命令
  | 'network'    // 网络请求
  | 'sensitive'; // 敏感操作

interface PermissionCheck {
  scope: PermissionScope;
  resource: string;  // 具体资源标识
  action: string;    // 具体操作
}
```

## 权限检查流程

```
工具请求执行
     ↓
  检查用户已保存的规则 (settings.json)
     ↓
  匹配到 allow → 放行
  匹配到 deny  → 拒绝
  匹配到 ask   → 弹出确认
  无匹配       → 默认 ask
     ↓
  用户确认？
  ├─ 是 → 询问是否保存规则
  └─ 否 → 拒绝执行
```

## 实现

```typescript
// permissions.ts
class PermissionManager {
  private rules: PermissionRule[] = [];
  private settingsPath: string;

  constructor(settingsPath: string) {
    this.settingsPath = settingsPath;
    this.loadRules();
  }

  private loadRules() {
    try {
      const data = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
      this.rules = data.permissions || [];
    } catch {
      this.rules = [];
    }
  }

  private saveRules() {
    const data = { permissions: this.rules };
    fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2));
  }

  // 检查是否有已保存的规则
  check(check: PermissionCheck): PermissionAction | null {
    for (const rule of this.rules) {
      if (rule.scope === check.scope && minimatch(check.resource, rule.pattern)) {
        return rule.action;
      }
    }
    return null; // 无匹配规则
  }

  // 添加规则
  addRule(rule: PermissionRule) {
    this.rules.push(rule);
    this.saveRules();
  }

  // 交互式确认
  async confirm(toolName: string, check: PermissionCheck): Promise<boolean> {
    // 在 Ink 中实现: 显示确认对话框
    // 返回用户的选择
    return false; // placeholder
  }
}
```

## UI: 确认对话框

```tsx
function PermissionDialog({
  toolName,
  resource,
  onAllow,
  onDeny,
  onSave,
}: {
  toolName: string;
  resource: string;
  onAllow: () => void;
  onDeny: () => void;
  onSave: (action: PermissionAction) => void;
}) {
  const [choice, setChoice] = useState<'allow' | 'deny' | null>(null);

  useInput((input) => {
    if (input === 'y') { setChoice('allow'); onAllow(); }
    if (input === 'n') { setChoice('deny'); onDeny(); }
  });

  return (
    <Box flexDirection="column" borderStyle="double" padding={1}>
      <Text bold color="yellow">Permission Required</Text>
      <Text>Tool: <Text bold>{toolName}</Text></Text>
      <Text>Resource: <Text dimColor>{resource}</Text></Text>
      <Box marginTop={1}>
        <Text>[<Text color="green" bold>y</Text>] Allow </Text>
        <Text>[<Text color="red" bold>n</Text>] Deny </Text>
        <Text>[<Text color="cyan" bold>s</Text>] Save rule</Text>
      </Box>
    </Box>
  );
}
```

## settings.json 格式

```json
{
  "permissions": [
    {
      "scope": "read",
      "pattern": "**/*.ts",
      "action": "allow"
    },
    {
      "scope": "execute",
      "pattern": "git *",
      "action": "allow"
    },
    {
      "scope": "execute",
      "pattern": "rm -rf *",
      "action": "deny"
    },
    {
      "scope": "write",
      "pattern": "**/*",
      "action": "ask"
    }
  ]
}
```

## 下一步
→ 完整 Harness 架构 (06-harness-architecture.md)
