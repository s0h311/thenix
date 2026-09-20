import { throwError } from './logging.ts'

const FEATURE = 'libs/Utils getHost'

export function getHost(): string {
  const host = process.env.SERVER_HOST

  if (!host) {
    throwError({
      feature: FEATURE,
      message: 'Host must be set',
    })
  }

  return host
}
