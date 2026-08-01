import { normalizeAppError } from '~/domain/errors/appError'

type ApiRequestOptions = NonNullable<Parameters<typeof $fetch>[1]>

const RETRY_DELAYS = [150, 450]

function isReadRequest(options?: ApiRequestOptions) {
  const method = String(options?.method ?? 'GET').toUpperCase()
  return method === 'GET' || method === 'HEAD'
}

export async function apiRequest<T>(request: string, options?: ApiRequestOptions): Promise<T> {
  const retryDelays = isReadRequest(options) ? RETRY_DELAYS : []

  for (let attempt = 0; ; attempt += 1) {
    try {
      return options ? await $fetch<T>(request, options) : await $fetch<T>(request)
    } catch (error) {
      const appError = normalizeAppError(error)
      const delay = retryDelays[attempt]
      if (!appError.retryable || delay === undefined) throw appError
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
