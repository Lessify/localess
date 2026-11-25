// @ts-check
import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

// Type-aware rules for the bugs a compile does not catch: a promise not awaited, `any` spreading from untyped
// values, an `unknown` printed as `[object Object]`. Formatting is Prettier's (`pnpm prettier`), not ESLint's.
// Left out: consistent-type-imports (its fix would turn the classes Nest injects by their runtime type into type
// imports, which compile and break injection).
export default tseslint.config(
  { ignores: ['dist/**', 'dist-dev/**', 'drizzle/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // As the web: imports and exports in one order, fixed by `pnpm lint:fix` (side-effect imports such as
      // reflect-metadata stay first).
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // `async () => value` where a promise is expected (a template's `bytes`, a mock, a `changeSpace` work) is the
      // plain way to write it; `() => Promise.resolve(value)` says the same with more noise.
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // A response's `json()` is `any` by nature: the tests read it as the API answers it. A floating promise stays an
    // error here too (an assertion that never ran).
    files: ['test/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
