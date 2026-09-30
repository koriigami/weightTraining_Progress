import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  // tsconfig says jsx: preserve (Next compiles it), so tests that import a .tsx component need the transform spelled out.
  oxc: { jsx: { runtime: 'automatic' } },
  test: { include: ['tests/**/*.test.ts'] },
});
