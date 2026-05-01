# 组件模式与状态管理

## 聊天界面架构

一个 Agent Harness 的核心 UI 是聊天界面：
```
┌─────────────────────────────┐
│  [Message List]             │  ← 消息区域（可滚动）
│  user: 帮我写个函数          │
│  assistant: 好的，这是...    │
│  [tool] 执行中...           │
├─────────────────────────────┤
│  > 输入框_                   │  ← 输入区域
└─────────────────────────────┘
```

## 关键组件

### 1. Message 组件

```tsx
type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

interface MessageProps {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

function Message({ role, content }: MessageProps) {
  const colors: Record<MessageRole, string> = {
    user: 'blue',
    assistant: 'green',
    tool: 'yellow',
    system: 'gray',
  };

  return (
    <Box marginBottom={1}>
      <Text bold color={colors[role]}>[{role}] </Text>
      <Text wrap="wrap">{content}</Text>
    </Box>
  );
}
```

### 2. MessageList 组件（带滚动）

```tsx
function MessageList({ messages }: { messages: Message[] }) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { rows } = useStdoutDimensions();

  useInput((input, key) => {
    if (key.upArrow) setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow) setScrollOffset(o => o + 1);
  });

  const visibleCount = rows - 5; // 留出输入区空间
  const visible = messages.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {visible.map((msg, i) => (
        <Message key={i} {...msg} />
      ))}
    </Box>
  );
}
```

### 3. TextInput 组件

```tsx
import { Text } from 'ink';
import TextInput from 'ink-text-input';

function PromptInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');

  return (
    <Box>
      <Text color="cyan">{'> '}</Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={(v) => {
          onSubmit(v);
          setValue('');
        }}
      />
    </Box>
  );
}
```

## 自定义 Hook 设计

### useChat — 核心对话状态

```tsx
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (content: string) => {
    setState(s => ({
      ...s,
      messages: [...s.messages, { role: 'user', content }],
      isLoading: true,
    }));

    try {
      const response = await callAgent([...state.messages, { role: 'user', content }]);
      setState(s => ({
        ...s,
        messages: [...s.messages, response],
        isLoading: false,
      }));
    } catch (err) {
      setState(s => ({ ...s, error: String(err), isLoading: false }));
    }
  }, [state.messages]);

  return { ...state, sendMessage };
}
```

### useStreamChat — 流式输出

```tsx
function useStreamChat() {
  const [streaming, setStreaming] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    setStreaming('');

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      messages: [...messages, { role: 'user', content }],
      max_tokens: 4096,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        setStreaming(prev => prev + event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: final.content[0].type === 'text' ? final.content[0].text : '',
    }]);
    setStreaming('');
  }, [messages]);

  return { messages, streaming, sendMessage };
}
```

## Context 跨组件状态

```tsx
// harness-context.tsx
interface HarnessContextType {
  messages: Message[];
  addMessage: (msg: Message) => void;
  tools: Tool[];
  registerTool: (tool: Tool) => void;
  config: HarnessConfig;
}

const HarnessContext = React.createContext<HarnessContextType>(null!);

export function HarnessProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);

  const value = useMemo(() => ({
    messages,
    addMessage: (msg: Message) => setMessages(prev => [...prev, msg]),
    tools,
    registerTool: (tool: Tool) => setTools(prev => [...prev, tool]),
    config: loadConfig(),
  }), [messages, tools]);

  return (
    <HarnessContext.Provider value={value}>
      {children}
    </HarnessContext.Provider>
  );
}

export const useHarness = () => React.useContext(HarnessContext);
```

## 组装完整界面

```tsx
// src/app.tsx
function App() {
  return (
    <HarnessProvider>
      <Box flexDirection="column" height="100%">
        <Header />
        <MessageList />
        <Divider />
        <PromptInput />
      </Box>
    </HarnessProvider>
  );
}
```

## 下一步
→ 工具系统 (03-tool-system.md)
