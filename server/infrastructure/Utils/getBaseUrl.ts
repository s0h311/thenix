import { throwError } from './logging.ts'

const FEATURE = 'libs/Utils getBaseUrl'

export function getBaseUrl(): string {
  const host = process.env.SERVER_HOST
  const environment = process.env.ENVIRONMENT

  if (!host) {
    throwError({
      feature: FEATURE,
      message: 'Host must be set',
    })
  }

  if (!environment) {
    throwError({
      feature: FEATURE,
      message: 'Environment must be set',
    })
  }

  if (environment === 'development') {
    return `http://${host}`
  }

  return `https://${host}`
}
