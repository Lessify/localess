// @ts-check
import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

// The server's rules (apps/server/eslint.config.js): type-aware, imports sorted. Read through tsconfig.test.json,
// which holds the tests too (tsconfig.json builds without them).
export default tseslint.config(
  { ignores: ['dist/**'] },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { project: './tsconfig.test.json', tsconfigRootDir: import.meta.dirname } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // `async () => value` where a promise is expected is the plain way to write it.
      '@typescript-eslint/require-await': 'off',
    },
  },
);
