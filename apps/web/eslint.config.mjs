import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const functionQualityRules = {
  'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', 2],
  complexity: ['error', 10],
  'max-params': ['error', 4],
  'max-statements': ['error', 20],
  curly: ['error', 'all'],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-else-return': ['error', { allowElseIf: false }],
  'no-duplicate-imports': 'error',
  'no-implicit-coercion': 'error',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', '**/*.test-helpers.{ts,tsx}'],
    rules: functionQualityRules,
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
