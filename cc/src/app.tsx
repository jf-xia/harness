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
import { log } from './logger.js';

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
    log.group('APP', 'Creating AgentLoop');
    const a = new AgentLoop({
      model: 'mimo-v2.5',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      maxTokens: 4096,
      settingsPath: '.harness/settings.json',
      onEvent: (event: AgentEvent) => {
        log.info('EVENT', `→ ${event.type}`, event.type === 'text' ? event.content?.slice(0, 60) : undefined);
        switch (event.type) {
          case 'text_delta':
            setStreaming(prev => prev + event.content);
            break;
          case 'text':
            setStreaming('');
            setMessages(prev => [...prev, { role: 'assistant', content: event.content }]);
            break;
          case 'tool_start':
            log.step('APP', `Tool starting: ${event.name}`);
            setMessages(prev => [...prev, {
              role: 'tool',
              content: `Running ${event.name}...`,
              toolName: event.name,
            }]);
            break;
          case 'tool_result':
            log.step('APP', `Tool result for ${event.name}: ${event.isError ? 'ERROR' : 'OK'}`);
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
            log.error('APP', `Agent error: ${event.error}`);
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${event.error}` }]);
            break;
          case 'done':
            log.success('APP', 'Agent done');
            break;
        }
      },
      onPermissionRequest: (toolName, scope, resource) => {
        log.warn('APP', `Permission requested: ${toolName} (${scope}) for "${resource}"`);
        return new Promise<boolean>((resolve) => {
          setPendingPermission({ toolName, resource, resolve });
        });
      },
    });

    // 注册工具
    log.step('APP', 'Registering tools...');
    a.registry.register(ReadFileTool);
    a.registry.register(BashTool);
    a.registry.register(WriteFileTool);
    a.registry.register(GlobTool);
    agentRef.current = a;

    log.groupEnd();
    return a;
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    if (value === '/quit' || value === '/exit') {
      log.step('APP', 'User quit');
      exit();
      return;
    }

    if (value === '/clear') {
      log.step('APP', 'User cleared chat');
      setMessages([{ role: 'assistant', content: 'Chat cleared.' }]);
      agentRef.current?.contextManager.reset();
      return;
    }

    log.group('APP', `User submitted: "${value.slice(0, 60)}${value.length > 60 ? '...' : ''}"`);
    setMessages(prev => [...prev, { role: 'user', content: value }]);
    setIsProcessing(true);
    setStreaming('');

    try {
      await agent.run(value);
    } catch (err: any) {
      log.error('APP', `Fatal error: ${err.message}`);
      setMessages(prev => [...prev, { role: 'system', content: `Fatal: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
      setStreaming('');
      log.groupEnd();
      log.info('APP', 'Ready for next input');
    }
  }, [agent, exit]);

  const handlePermissionDecision = useCallback((granted: boolean, save: boolean) => {
    if (!pendingPermission) return;

    log.step('APP', `Permission decision: ${granted ? 'ALLOW' : 'DENY'}, save=${save}`);
    if (save) {
      log.info('APP', 'Persisting permission rule...');
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
