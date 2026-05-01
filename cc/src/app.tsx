import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { DisplayMessage, AgentEvent } from './types.js';
import { AgentLoop } from './agent/loop.js';
import { ReadFileTool } from './tools/read-file.js';
import { BashTool } from './tools/bash.js';
import { WriteFileTool } from './tools/write-file.js';
import { GlobTool } from './tools/glob.js';
import { Header } from './components/Header.js';
import { MessageList } from './components/MessageList.js';
import { PromptInput } from './components/PromptInput.js';
import { PermissionDialog } from './components/PermissionDialog.js';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful coding assistant running in a terminal CLI called "Harness".
You have access to tools for reading/writing files and executing shell commands.
Be concise and helpful. When writing code, explain briefly what you're doing.`;

interface PendingPermission {
  toolName: string;
  resource: string;
  resolve: (granted: boolean) => void;
}

export function App() {
  const { exit } = useApp();

  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: 'assistant', content: 'Hello! I am your Harness assistant.\nType a message to get started, or /quit to exit.' },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);

  const agentRef = useRef<AgentLoop | null>(null);

  const agent = useMemo(() => {
    const a = new AgentLoop({
      model: 'claude-sonnet-4-20250514',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      maxTokens: 4096,
      settingsPath: '.harness/settings.json',
      onEvent: (event: AgentEvent) => {
        switch (event.type) {
          case 'text_delta':
            setStreaming(prev => prev + event.content);
            break;
          case 'text':
            setStreaming('');
            setMessages(prev => [...prev, { role: 'assistant', content: event.content }]);
            break;
          case 'tool_start':
            setMessages(prev => [...prev, {
              role: 'tool',
              content: `Running ${event.name}...`,
              toolName: event.name,
            }]);
            break;
          case 'tool_result':
            setMessages(prev => {
              // 更新最后的 tool 消息
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.role === 'tool') {
                updated[lastIdx] = {
                  role: 'tool',
                  content: event.isError ? `Error: ${event.output}` : event.output,
                  toolName: event.name,
                  isError: event.isError,
                };
              }
              return updated;
            });
            break;
          case 'error':
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${event.error}` }]);
            break;
          case 'done':
            break;
        }
      },
      onPermissionRequest: (toolName, scope, resource) => {
        return new Promise<boolean>((resolve) => {
          setPendingPermission({ toolName, resource, resolve });
        });
      },
    });

    // 注册工具
    a.registry.register(ReadFileTool);
    a.registry.register(BashTool);
    a.registry.register(WriteFileTool);
    a.registry.register(GlobTool);
    agentRef.current = a;

    return a;
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    if (value === '/quit' || value === '/exit') {
      exit();
      return;
    }

    if (value === '/clear') {
      setMessages([{ role: 'assistant', content: 'Chat cleared.' }]);
      agentRef.current?.contextManager.reset();
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: value }]);
    setIsProcessing(true);
    setStreaming('');

    try {
      await agent.run(value);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'system', content: `Fatal: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
      setStreaming('');
    }
  }, [agent, exit]);

  const handlePermissionDecision = useCallback((granted: boolean, save: boolean) => {
    if (!pendingPermission) return;

    if (save) {
      // 导入 permission manager 并保存规则
      const { PermissionManager } = require('./permissions/manager.js');
      const pm = new PermissionManager('.harness/settings.json');
      pm.addRule({
        scope: 'execute',
        pattern: pendingPermission.resource,
        action: 'allow',
      });
    }

    pendingPermission.resolve(granted);
    setPendingPermission(null);
  }, [pendingPermission]);

  useInput((keyChar, key) => {
    if (key.ctrl && keyChar === 'c') exit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header messageCount={messages.length} />
      <MessageList messages={messages} streaming={streaming} />
      {pendingPermission && (
        <PermissionDialog
          toolName={pendingPermission.toolName}
          resource={pendingPermission.resource}
          onDecision={handlePermissionDecision}
        />
      )}
      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isProcessing || !!pendingPermission}
      />
    </Box>
  );
}
