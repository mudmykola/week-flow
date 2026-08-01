export type AppErrorCode =
  'network' | 'rate_limited' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'server' | 'unknown'

export class AppError extends Error {
  override readonly name = 'AppError'

  constructor(
    public readonly code: AppErrorCode,
    public readonly status: number | null,
    public readonly retryable: boolean,
    public override readonly cause?: unknown
  ) {
    super(`api.${code}`)
  }
}

export function normalizeAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  const candidate = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  const status = candidate?.statusCode ?? candidate?.status ?? candidate?.response?.status ?? null
  const code: AppErrorCode =
    status === 401
      ? 'unauthorized'
      : status === 403
        ? 'forbidden'
        : status === 404
          ? 'not_found'
          : status === 409
            ? 'conflict'
            : status === 429
              ? 'rate_limited'
              : status !== null && status >= 500
                ? 'server'
                : status === null
                  ? 'network'
                  : 'unknown'

  return new AppError(
    code,
    status,
    status === null || status === 408 || status === 429 || (status >= 500 && status <= 599),
    error
  )
}
