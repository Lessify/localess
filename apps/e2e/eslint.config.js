// @ts-check
import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

// The server's rules (apps/server/eslint.config.js), as for its tests. What matters most here: a floating promise is
// an error, so an `expect(locator)…` or an action without `await` (a step that never ran) fails the lint, not
// silently the test. scripts/start-server.mjs is plain Node and left out.
export default tseslint.config(
  { ignores: ['test-results/**', 'playwright-report/**', 'demo-videos/**', '.data*/**', 'scripts/**'] },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/require-await': 'off',
      // A response's `json()` is `any` by nature: a test reads it as the API answers it.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // `async ({}, use) => …`: Playwright's form for a fixture that needs no other fixture.
      'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
    },
  },
);
