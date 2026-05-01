import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  target: 'node18',
  platform: 'node',
  external: [
    'react',
    'ink',
    'ink-spinner',
    'ink-select-input',
  ],
  noExternal: [],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
  onSuccess: async () => {
    console.log('Build completed successfully!');
  },
});
