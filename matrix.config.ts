import type { Config } from '../matrix/src/types.ts'

const config: Config = {
  maxIterations: 20,
  github: {
    owner: 's0h311',
    repo: 'thenix',
  },
  checks: {
    strategy: 'afterAll',
    fmtCmd: 'pnpm fmt',
    lintCmd: 'pnpm lint --format json',
    testCmd: 'pnpm test',
  },
  review: true,
}

export default config
