// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { isHealthyPayload, verifyProductionHealth } from '../../scripts/production-health.mjs'

function response(body: unknown, contentType = 'application/json', status = 200) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType }
  })
}

describe('production health verifier', () => {
  it('accepts only the API and D1 health contract', () => {
    expect(isHealthyPayload({ status: 'ok', database: 'ok' })).toBe(true)
    expect(isHealthyPayload({ status: 'ok' })).toBe(false)
    expect(isHealthyPayload(null)).toBe(false)
  })

  it('retries an HTTP 200 stale HTML response until the new Worker is healthy', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response('<!doctype html><title>WeekFlow</title>', 'text/html'))
      .mockResolvedValueOnce(response({ status: 'ok', database: 'ok', requestId: 'deploy-123' }))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(
      verifyProductionHealth({
        url: 'https://weekflow.pp.ua/api/health',
        requestId: 'deploy-123',
        fetchImpl,
        sleep,
        delayMs: 0
      })
    ).resolves.toMatchObject({ status: 'ok', database: 'ok' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledOnce()
  })

  it('fails with a sanitized diagnostic after exhausting retries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response('maintenance', 'text/html', 503))

    await expect(
      verifyProductionHealth({
        url: 'https://weekflow.pp.ua/api/health',
        requestId: 'deploy-123',
        attempts: 2,
        delayMs: 0,
        fetchImpl,
        sleep: vi.fn().mockResolvedValue(undefined)
      })
    ).rejects.toThrow('HTTP 503, content-type text/html')
  })
})
