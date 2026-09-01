// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { isHealthyPayload, verifyOAuthEntry, verifyProductionHealth } from '../../scripts/production-health.mjs'

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

  it('verifies the Google OAuth provider and canonical production callback', async () => {
    const location = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    location.searchParams.set('client_id', 'client.apps.googleusercontent.com')
    location.searchParams.set('redirect_uri', 'https://weekflow.pp.ua/auth/google')
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: location.toString() } }))

    await expect(
      verifyOAuthEntry({
        url: 'https://weekflow.pp.ua/auth/google',
        expectedRedirectUri: 'https://weekflow.pp.ua/auth/google',
        fetchImpl
      })
    ).resolves.toMatchObject({ durationMs: expect.any(Number) })
  })

  it('rejects an OAuth redirect with a mismatched callback', async () => {
    const location = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    location.searchParams.set('client_id', 'client.apps.googleusercontent.com')
    location.searchParams.set('redirect_uri', 'http://localhost:3000/auth/google')

    await expect(
      verifyOAuthEntry({
        url: 'https://weekflow.pp.ua/auth/google',
        expectedRedirectUri: 'https://weekflow.pp.ua/auth/google',
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response(null, { status: 302, headers: { location: location.toString() } }))
      })
    ).rejects.toThrow('callback URL mismatch')
  })
})
