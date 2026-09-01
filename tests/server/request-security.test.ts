// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isTrustedRequestOrigin, isUnsafeApiRequest, isValidOAuthState } from '../../server/utils/requestSecurity'

describe('request security', () => {
  it('guards only mutation API requests', () => {
    expect(isUnsafeApiRequest('POST', '/api/tasks')).toBe(true)
    expect(isUnsafeApiRequest('DELETE', '/api/account')).toBe(true)
    expect(isUnsafeApiRequest('GET', '/api/tasks')).toBe(false)
    expect(isUnsafeApiRequest('POST', '/auth/google')).toBe(false)
  })

  it('accepts same-origin and non-browser requests but rejects foreign or malformed origins', () => {
    expect(isTrustedRequestOrigin(undefined, 'https://weekflow.pp.ua')).toBe(true)
    expect(isTrustedRequestOrigin('https://weekflow.pp.ua', 'https://weekflow.pp.ua')).toBe(true)
    expect(isTrustedRequestOrigin('https://evil.example', 'https://weekflow.pp.ua')).toBe(false)
    expect(isTrustedRequestOrigin('not-a-url', 'https://weekflow.pp.ua')).toBe(false)
  })

  it('requires an exact OAuth state match', () => {
    expect(isValidOAuthState('safe-state', 'safe-state')).toBe(true)
    expect(isValidOAuthState('safe-state', 'other-state')).toBe(false)
    expect(isValidOAuthState('', '')).toBe(false)
    expect(isValidOAuthState(undefined, 'safe-state')).toBe(false)
  })

  it('keeps OAuth state in a short-lived secure cookie and publishes browser hardening headers', () => {
    const oauthRoute = readFileSync(resolve(process.cwd(), 'server/routes/auth/google.get.ts'), 'utf8')
    const headers = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8')

    expect(oauthRoute).toContain("sameSite: 'lax'")
    expect(oauthRoute).toContain('httpOnly: true')
    expect(oauthRoute).toContain('maxAge: 600')
    expect(oauthRoute).toContain('isValidOAuthState')
    expect(headers).toContain("frame-ancestors 'none'")
    expect(headers).toContain('Strict-Transport-Security')
    expect(headers).toContain('X-Content-Type-Options: nosniff')
  })
})
