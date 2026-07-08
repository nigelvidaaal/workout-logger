import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // server files run in Node.js — require, module, process are valid globals
  {
    files: ['server/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node
    }
  },

  // test files — need Vitest globals (vi, test, expect, describe)
  {
    files: ['**/*.test.jsx', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: true,
        test: true,
        expect: true,
        describe: true,
        beforeEach: true,
        afterEach: true
      }
    }
  },

  // frontend files run in the browser
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])