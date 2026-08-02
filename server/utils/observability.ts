const requestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/

export type RequestLogLevel = 'info' | 'error'

export interface RequestLogRecord {
  timestamp: string
  level: RequestLogLevel
  event: 'http_request'
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  error?: string
}

export function resolveRequestId(value?: string | null, fallback = () => crypto.randomUUID()) {
  return value && requestIdPattern.test(value) ? value : fallback()
}

export function createRequestLog(input: Omit<RequestLogRecord, 'timestamp' | 'event'>): RequestLogRecord {
  return {
    timestamp: new Date().toISOString(),
    event: 'http_request',
    ...input,
    durationMs: Math.max(0, Math.round(input.durationMs))
  }
}
