import { throwError } from './logging.ts'
import type { Environment } from './types.ts'

const FEATURE = 'libs/Utils getEnvironment'

export function getEnvironment(): Environment {
  const environment = process.env.ENVIRONMENT

  if (!environment) {
    throwError({
      feature: FEATURE,
      message: 'Environment must be set',
    })
  }

  if (environment === 'development') {
    return 'development'
  }

  if (environment === 'test') {
    return 'test'
  }

  if (environment === 'production') {
    return 'production'
  }

  throwError({
    feature: FEATURE,
    message: 'Unknown environment',
    additional: {
      environment,
    },
  })
}

export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}
