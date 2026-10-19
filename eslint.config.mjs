import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import css from '@eslint/css';
import globals from 'globals';

export default defineConfig([
  { ignores: ['dist/**', 'node_modules/**', '.idea/**'] },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022 },
    rules: {
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['*.mjs', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.css'],
    language: 'css/css',
    plugins: { css },
    extends: ['css/recommended'],
    rules: { 'css/no-important': 'off' },
  },
]);
