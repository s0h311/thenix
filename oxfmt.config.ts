import { defineConfig } from 'oxfmt'

export default defineConfig({
  semi: false,
  singleQuote: true,
  printWidth: 120,
  jsxSingleQuote: true,
  singleAttributePerLine: true,
  ignorePatterns: ['*.gen.ts', 'server/infrastructure/Database/migrations'],
})
