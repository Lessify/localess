module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/coverage/**/*', // Ignore coverage output - generated JS, not source.
    'src/**/*.test.ts', // Tests are excluded from tsconfig, so typed linting cannot parse them.
    'vitest.config.mts',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // `avoidEscape` keeps single quotes as the default while letting a string that itself
    // contains an apostrophe stay double-quoted instead of being littered with backslashes.
    quotes: ['error', 'single', { avoidEscape: true }],
    'import/no-unresolved': 0,
    'max-len': ['error', { code: 180 }],
    'linebreak-style': 0,
    // Pre-existing debt: 17 `any`s remain in tasks.ts, webhook-utils.ts and content.model.ts.
    // Typing them properly means narrowing catch variables and giving several task-export
    // helpers real return types - worth doing, but not worth blocking CI on, so these report
    // without failing the build until they are cleaned up.
    '@typescript-eslint/no-explicit-any': 'warn',
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
  },
};
