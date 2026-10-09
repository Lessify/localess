// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['src/app/shared/generated/**/*', 'src/environments/*', '**/*.spec.ts'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      prettierRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'll', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'll', style: 'kebab-case' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.html'],
    ignores: ['**/*inline-template-*.component.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility, prettierRecommended],
    rules: {
      'prettier/prettier': ['error', { parser: 'angular' }],
    },
  },
);
