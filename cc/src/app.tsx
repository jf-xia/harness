import React, { useState, useCallback, useMemo, useRef } from "react";
import { Box, useApp, useInput } from "ink";
import type { DisplayMessage, AgentEvent } from "./types.js";
import { AgentLoop } from "./agent/loop.js";
import { ReadFileTool } from "./tools/read-file.js";
import { BashTool } from "./tools/bash.js";
import { WriteFileTool } from "./tools/write-file.js";
import { GlobTool } from "./tools/glob.js";
import { AgentBrowserTool } from "./tools/agent-browser.js";
import { Header } from "./components/Header.js";
import { MessageList } from "./components/MessageList.js";
import { PromptInput } from "./components/PromptInput.js";
import { PermissionDialog } from "./components/PermissionDialog.js";
import { log } from "./logger.js";

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
    {
      role: "assistant",
      content:
        "Hello! I am your Harness assistant.\nType a message to get started, or /quit to exit.\n/debug to toggle debug mode.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [debugMode, setDebugMode] = useState(true);
  const [pendingPermission, setPendingPermission] =
    useState<PendingPermission | null>(null);

  const agentRef = useRef<AgentLoop | null>(null);

  const agent = useMemo(() => {
    log.group("APP", "Creating AgentLoop");
    const a = new AgentLoop({
      model: "mimo-v2.5",
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      maxTokens: 4096,
      settingsPath: ".harness/settings.json",
      onEvent: (event: AgentEvent) => {
        log.info("EVENT", `→ ${event.type}`);
        switch (event.type) {
          case "text_delta":
            setStreaming((prev) => prev + event.content);
            break;
          case "text":
            setStreaming("");
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: event.content },
            ]);
            break;
          case "api_call":
            if (debugMode) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "debug" as const,
                  content: "",
                  debugData: {
                    label: "API CALL",
                    file: "src/agent/loop.ts",
                    func: "callAPI",
                    line: 155,
                    detail: {
                      model: event.model,
                      messages: event.messageCount,
                      tools: event.toolNames,
                      max_tokens: 4096,
                    },
                  },
                },
              ]);
            }
            break;
          case "api_response":
            if (debugMode) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "debug" as const,
                  content: "",
                  debugData: {
                    label: `API RESPONSE (iteration #${event.iteration})`,
                    file: "src/agent/loop.ts",
                    func: "run",
                    line: 91,
                    detail: {
                      stop_reason: event.stopReason,
                      blocks: event.blockTypes,
                    },
                  },
                },
              ]);
            }
            break;
          case "tool_start":
            log.step("APP", `Tool starting: ${event.name}`);
            setMessages((prev) => {
              const next = [
                ...prev,
                {
                  role: "tool" as const,
                  content: `Running ${event.name}...`,
                  toolName: event.name,
                },
              ];
              if (debugMode) {
                next.push({
                  role: "debug" as const,
                  content: "",
                  debugData: {
                    label: `TOOL CALL → ${event.name}`,
                    file: `src/tools/${event.name.replace(/_/g, "-")}.ts`,
                    func: "execute",
                    detail: event.input,
                  },
                });
              }
              return next;
            });
            break;
          case "tool_result":
            log.step(
              "APP",
              `Tool result for ${event.name}: ${event.isError ? "ERROR" : "OK"}`,
            );
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.findLastIndex((m) => m.role === "tool");
              if (lastIdx >= 0) {
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: event.isError
                    ? `Error: ${event.output}`
                    : event.output,
                  isError: event.isError,
                };
              }
              if (debugMode) {
                updated.push({
                  role: "debug" as const,
                  content: "",
                  debugData: {
                    label: `TOOL RESULT ← ${event.name} ${event.isError ? "(ERROR)" : "(OK)"}`,
                    file: `src/tools/${event.name.replace(/_/g, "-")}.ts`,
                    func: "execute",
                    detail:
                      event.output.slice(0, 500) +
                      (event.output.length > 500 ? "\n...(truncated)" : ""),
                  },
                });
              }
              return updated;
            });
            break;
          case "error":
            log.error("APP", `Agent error: ${event.error}`);
            setMessages((prev) => [
              ...prev,
              { role: "system", content: `Error: ${event.error}` },
            ]);
            break;
          case "done":
            log.success("APP", "Agent done");
            break;
        }
      },
      onPermissionRequest: (toolName, scope, resource) => {
        log.warn(
          "APP",
          `Permission requested: ${toolName} (${scope}) for "${resource}"`,
        );
        return new Promise<boolean>((resolve) => {
          setPendingPermission({ toolName, resource, resolve });
        });
      },
    });

    // 注册工具
    log.step("APP", "Registering tools...");
    a.registry.register(ReadFileTool);
    a.registry.register(BashTool);
    a.registry.register(WriteFileTool);
    a.registry.register(GlobTool);
    a.registry.register(AgentBrowserTool);
    agentRef.current = a;

    log.groupEnd();
    return a;
  }, []);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (!value.trim()) return;

      if (value === "/quit" || value === "/exit") {
        log.step("APP", "User quit");
        exit();
        return;
      }

      if (value === "/clear") {
        log.step("APP", "User cleared chat");
        setMessages([{ role: "assistant", content: "Chat cleared." }]);
        agentRef.current?.contextManager.reset();
        return;
      }

      if (value === "/debug") {
        setDebugMode((prev) => {
          const next = !prev;
          log.step("APP", `Debug mode: ${next ? "ON" : "OFF"}`);
          setMessages((msgs) => [
            ...msgs,
            {
              role: "system",
              content: `Debug mode ${next ? "ENABLED" : "DISABLED"}`,
            },
          ]);
          return next;
        });
        return;
      }

      log.group(
        "APP",
        `User submitted: "${value.slice(0, 60)}${value.length > 60 ? "..." : ""}"`,
      );
      setMessages((prev) => [...prev, { role: "user", content: value }]);
      setIsProcessing(true);
      setStreaming("");

      try {
        await agent.run(value);
      } catch (err: any) {
        log.error("APP", `Fatal error: ${err.message}`);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `Fatal: ${err.message}` },
        ]);
      } finally {
        setIsProcessing(false);
        setStreaming("");
        log.groupEnd();
        log.info("APP", "Ready for next input");
      }
    },
    [agent, exit],
  );

  const handlePermissionDecision = useCallback(
    (granted: boolean, save: boolean) => {
      if (!pendingPermission) return;

      log.step(
        "APP",
        `Permission decision: ${granted ? "ALLOW" : "DENY"}, save=${save}`,
      );
      if (save) {
        log.info("APP", "Persisting permission rule...");
        // 导入 permission manager 并保存规则
        const { PermissionManager } = require("./permissions/manager.js");
        const pm = new PermissionManager(".harness/settings.json");
        pm.addRule({
          scope: "execute",
          pattern: pendingPermission.resource,
          action: "allow",
        });
      }

      pendingPermission.resolve(granted);
      setPendingPermission(null);
    },
    [pendingPermission],
  );

  useInput((keyChar, key) => {
    if (key.ctrl && keyChar === "c") exit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header messageCount={messages.length} debugMode={debugMode} />
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
