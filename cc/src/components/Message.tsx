import React from 'react';
import { Box, Text } from 'ink';
import type { DisplayMessage } from '../types.js';

const roleConfig: Record<string, { color: string; label: string }> = {
  user: { color: 'blue', label: 'You' },
  assistant: { color: 'green', label: 'Agent' },
  tool: { color: 'yellow', label: 'Tool' },
  system: { color: 'gray', label: 'System' },
};

export function MessageView({ message }: { message: DisplayMessage }) {
  const config = roleConfig[message.role] || roleConfig.system;

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
