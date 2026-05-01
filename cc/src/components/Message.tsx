import React from 'react';
import { Box, Text } from 'ink';
import type { DisplayMessage } from '../types.js';

const roleConfig: Record<string, { color: string; label: string }> = {
  user: { color: 'blue', label: 'You' },
  assistant: { color: 'green', label: 'Agent' },
  tool: { color: 'yellow', label: 'Tool' },
  system: { color: 'gray', label: 'System' },
  debug: { color: 'gray', label: 'DEBUG' },
};

function formatDebugDetail(detail: unknown): string {
  if (detail === undefined) return '';
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

export function MessageView({ message }: { message: DisplayMessage }) {
  const config = roleConfig[message.role] || roleConfig.system;
  const isDebug = message.role === 'debug';

  if (isDebug && message.debugData) {
    const { label, file, func, line, detail } = message.debugData;
    const location = file ? `${file}${func ? ` → ${func}()` : ''}${line ? `:${line}` : ''}` : '';

    return (
      <Box flexDirection="column" marginBottom={0} borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text color="gray" dimColor>[DEBUG] </Text>
          <Text color="cyan" bold>{label}</Text>
          {location && <Text dimColor>  {location}</Text>}
        </Box>
        {detail !== undefined && (
          <Box paddingLeft={2} flexDirection="column">
            <Text dimColor wrap="wrap">{formatDebugDetail(detail)}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={config.color}>{`[${config.label}]`}
          {message.toolName && <Text dimColor> {message.toolName}</Text>}
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text wrap="wrap" color={message.isError ? 'red' : undefined}>
          {message.content}
        </Text>
      </Box>
    </Box>
  );
}
