import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { DisplayMessage } from '../types.js';
import { MessageView } from './Message.js';

export function MessageList({
  messages,
  streaming,
}: {
  messages: DisplayMessage[];
  streaming?: string;
}) {
  const { stdout } = useStdout();
  const rows = stdout?.rows || 24;
  const reservedRows = 6;
  const maxVisible = Math.max(5, rows - reservedRows);
  const visible = messages.slice(-maxVisible);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {visible.map((msg, i) => (
        <MessageView key={i} message={msg} />
      ))}
      {streaming && (
        <Box paddingLeft={2}>
          <Text color="green" wrap="wrap">{streaming}</Text>
        </Box>
      )}
    </Box>
  );
}
