import { defineConfig } from 'oxlint'

export default defineConfig({
  options: {
    typeAware: true,
    typeCheck: true,
  },
  plugins: ['unicorn', 'react', 'typescript', 'oxc', 'react-perf', 'vitest', 'jsx-a11y', 'node', 'import', 'promise'],
  ignorePatterns: ['*.gen.ts', 'server/infrastructure/Database/migrations', 'app/components/ui'],
  rules: {
    'max-params': ['error', { max: 2 }],
    'typescript/consistent-type-definitions': ['error', 'type'],
    eqeqeq: 'error',
    'typescript/no-array-delete': 'error',
    'typescript/no-non-null-assertion': 'error',
    'prefer-const': 'error',
    'unicorn/no-array-sort': ['error', { allowExpressionStatement: false }],
    'unicorn/no-array-reverse': ['error', { allowExpressionStatement: false }],
  },
})
