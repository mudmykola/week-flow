import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '~/data/http/apiClient'
import { AppError, normalizeAppError } from '~/domain/errors/appError'

const fetchMock = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => fetchMock)

describe('API reliability policy', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.useRealTimers()
  })

  it('normalizes transport and authorization failures', () => {
    expect(normalizeAppError(new Error('offline'))).toMatchObject({ code: 'network', retryable: true })
    expect(normalizeAppError({ statusCode: 401 })).toMatchObject({ code: 'unauthorized', retryable: false })
    expect(normalizeAppError({ response: { status: 503 } })).toMatchObject({ code: 'server', retryable: true })
    expect(normalizeAppError({ status: 403 }).code).toBe('forbidden')
    expect(normalizeAppError({ status: 404 }).code).toBe('not_found')
    expect(normalizeAppError({ status: 409 }).code).toBe('conflict')
    expect(normalizeAppError({ status: 429 }).code).toBe('rate_limited')
    expect(normalizeAppError({ status: 422 }).code).toBe('unknown')
    const stable = new AppError('conflict', 409, false)
    expect(normalizeAppError(stable)).toBe(stable)
  })

  it('retries retryable reads and returns the recovered response', async () => {
    vi.useFakeTimers()
    fetchMock.mockRejectedValueOnce({ statusCode: 503 }).mockResolvedValueOnce({ ok: true })
    const response = apiRequest<{ ok: boolean }>('/api/health')
    await vi.runAllTimersAsync()
    await expect(response).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never retries mutations and throws a stable application error', async () => {
    fetchMock.mockRejectedValue({ statusCode: 503 })
    await expect(apiRequest('/api/tasks', { method: 'POST' })).rejects.toBeInstanceOf(AppError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry non-retryable reads', async () => {
    fetchMock.mockRejectedValue({ statusCode: 404 })
    await expect(apiRequest('/api/missing')).rejects.toMatchObject({ code: 'not_found' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
