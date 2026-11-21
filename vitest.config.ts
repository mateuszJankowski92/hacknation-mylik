import { defineConfig } from 'vitest/config';

// Testy UI (web/src/**/*.test.tsx) muszą mieć na początku komentarz:
//   // @vitest-environment jsdom
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'web/src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    passWithNoTests: true,
  },
});
