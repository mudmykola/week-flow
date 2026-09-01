// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createAsyncTtlCache } from '../../server/utils/asyncTtlCache'

const authRoute = readFileSync(resolve(process.cwd(), 'server/routes/auth/google.get.ts'), 'utf8')
const authGuard = readFileSync(resolve(process.cwd(), 'server/utils/auth.ts'), 'utf8')

describe('production authentication performance', () => {
  it('deduplicates concurrent account lookups and refreshes them after the short TTL', async () => {
    const cache = createAsyncTtlCache<{ role: string }>(100)
    const loader = vi.fn(async () => ({ role: 'user' }))

    const [first, second] = await Promise.all([cache.get('user', loader, 1_000), cache.get('user', loader, 1_000)])
    expect(first).toEqual({ role: 'user' })
    expect(second).toEqual(first)
    expect(loader).toHaveBeenCalledTimes(1)

    await cache.get('user', loader, 1_101)
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('does not retain failed lookups', async () => {
    const cache = createAsyncTtlCache<string>(100)
    const loader = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce('ready')

    await expect(cache.get('user', loader)).rejects.toThrow('temporary')
    await expect(cache.get('user', loader)).resolves.toBe('ready')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('keeps legacy ownership migration out of OAuth and reports callback failures', () => {
    expect(authRoute).not.toContain('legacyProjects')
    expect(authRoute).not.toContain('db.batch')
    expect(authRoute).toContain('logOAuthFailure(event, error)')
    expect(authRoute).toContain("'/login?error=oauth'")
    expect(authRoute).toContain('isValidOAuthState')
    expect(authGuard).toContain('createAsyncTtlCache')
    expect(authGuard).toContain("appendResponseHeader(event, 'server-timing'")
  })
})
