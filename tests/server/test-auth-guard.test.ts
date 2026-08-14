// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('E2E session route security', () => {
  it('requires an explicit test flag and a long matching secret while production config exposes neither', () => {
    const route = readFileSync('server/api/__test__/session.post.ts', 'utf8')
    const wrangler = readFileSync('wrangler.toml', 'utf8')

    expect(route).toContain('NUXT_TEST_AUTH_ENABLED')
    expect(route).toContain('secret.length < 32')
    expect(route).toContain('suppliedSecret !== secret')
    expect(wrangler).not.toContain('NUXT_TEST_AUTH_ENABLED')
    expect(wrangler).not.toContain('NUXT_TEST_AUTH_SECRET')
  })
})
