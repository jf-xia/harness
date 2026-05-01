import React from 'react';
import { Box, Text } from 'ink';

export function Header({ messageCount }: { messageCount?: number }) {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
      <Box>
        <Text bold color="cyan">Harness CLI</Text>
        <Text dimColor> v0.1.0</Text>
      </Box>
      {messageCount !== undefined && (
        <Text dimColor>{messageCount} messages</Text>
      )}
    </Box>
  );
}
