import { throwError } from './logging.ts'

const FEATURE = 'libs/Utils getEnvVariable'

export function getEnvVariableOrThrow(variable: string): string {
  const value = process.env[variable]

  if (value === undefined) {
    throwError({
      feature: FEATURE,
      message: 'Environment variable not found',
      additional: {
        variable,
      },
    })
  }

  return value
}
