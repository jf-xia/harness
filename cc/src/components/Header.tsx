import React from 'react';
import { Box, Text } from 'ink';

export function Header({ messageCount, debugMode }: { messageCount?: number; debugMode?: boolean }) {
  return (
    <Box borderStyle="round" borderColor={debugMode ? 'yellow' : 'cyan'} paddingX={1} justifyContent="space-between">
      <Box>
        <Text bold color={debugMode ? 'yellow' : 'cyan'}>Harness CLI</Text>
        <Text dimColor> v0.1.0</Text>
        {debugMode && <Text color="yellow" bold> [DEBUG]</Text>}
      </Box>
      {messageCount !== undefined && (
        <Text dimColor>{messageCount} messages</Text>
      )}
    </Box>
  );
}
