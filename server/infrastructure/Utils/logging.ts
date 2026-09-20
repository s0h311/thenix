import { pino } from 'pino'
import pretty from 'pino-pretty'

const stream =
  process.env.ENVIRONMENT === 'development'
    ? pretty({
        colorize: true,
        ignore: 'hostname,pid',
      })
    : {}

const logger = pino(stream)

type LogData = {
  feature: string
  message: string
  additional?: unknown
}

export function logInfo(logData: LogData): void {
  logger.info({
    ...logData,
    additional: serializeAdditional(logData.additional),
  })
}

export function logWarn(logData: LogData): void {
  logger.warn({
    ...logData,
    additional: serializeAdditional(logData.additional),
  })
}

export function logError(logData: LogData): void {
  logger.error({
    ...logData,
    additional: serializeAdditional(logData.additional),
  })
}

export function throwError({ feature, message, additional }: LogData): never {
  if (additional) {
    throw new Error(`[${feature}] | ${message} | ${JSON.stringify(serializeAdditional(additional))}`)
  }

  throw new Error(`[${feature}] | ${message}`)
}

function serializeAdditional<T>(additional: T): T | Record<PropertyKey, PropertyKey> {
  if (!additional || typeof additional !== 'object') {
    return additional
  }

  const serializedAdditional: Record<PropertyKey, PropertyKey> = {}

  for (const [key, value] of Object.entries(additional)) {
    if (value instanceof Error) {
      serializedAdditional[key] = value.message
      continue
    }

    serializedAdditional[key] = value
  }

  return serializedAdditional
}
