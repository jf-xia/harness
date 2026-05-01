import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Box paddingX={1}>
      <Text color="cyan" bold>{'> '}</Text>
      {disabled ? (
        <Text dimColor>thinking...</Text>
      ) : (
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      )}
    </Box>
  );
}
