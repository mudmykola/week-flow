// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('OAuth-aware local development port', () => {
  it('fails before Nuxt can silently move away from the registered callback port', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
    const guard = readFileSync(resolve('scripts/check-dev-port.mjs'), 'utf8')
    expect(pkg.scripts.predev).toBe('node scripts/check-dev-port.mjs')
    expect(pkg.scripts.dev).toContain('--port 3000')
    expect(guard).toContain("error.code === 'EADDRINUSE'")
    expect(guard).toContain('http://${host}:${port}/auth/google')
  })
})
