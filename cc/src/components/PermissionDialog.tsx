import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export function PermissionDialog({
  toolName,
  resource,
  onDecision,
}: {
  toolName: string;
  resource: string;
  onDecision: (granted: boolean, save: boolean) => void;
}) {
  useInput((input, key) => {
    if (input === 'y') onDecision(true, false);
    if (input === 'n') onDecision(false, false);
    if (key.tab) onDecision(true, true); // Tab = allow + save
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" paddingX={1} marginBottom={1}>
      <Text bold color="yellow">Permission Required</Text>
      <Box>
        <Text dimColor>Tool: </Text>
        <Text bold>{toolName}</Text>
      </Box>
      <Box>
        <Text dimColor>Target: </Text>
        <Text>{resource}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>[<Text color="green" bold>y</Text>] Allow </Text>
        <Text>[<Text color="red" bold>n</Text>] Deny </Text>
        <Text>[<Text color="cyan" bold>Tab</Text>] Allow & Save</Text>
      </Box>
    </Box>
  );
}
