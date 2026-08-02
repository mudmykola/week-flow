// @vitest-environment node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { appNavigation, navigationForRole } from '../../app/domain/services/navigation'

describe('application navigation', () => {
  it('maps every shell destination to an existing Nuxt page', () => {
    for (const item of appNavigation) {
      const page = item.to === '/' ? 'index.vue' : `${item.to.slice(1)}/index.vue`
      expect(existsSync(resolve('app/presentation/pages', page)), `${item.to} is missing`).toBe(true)
    }
  })

  it('keeps destinations unique and respects role boundaries', () => {
    expect(new Set(appNavigation.map((item) => item.to)).size).toBe(appNavigation.length)
    expect(navigationForRole('user').some((item) => item.to === '/analytics')).toBe(true)
    expect(navigationForRole('user').some((item) => item.to === '/admin')).toBe(false)
    expect(navigationForRole('pm').some((item) => item.to === '/team')).toBe(true)
    expect(navigationForRole('admin').some((item) => item.to === '/admin')).toBe(true)
  })
})
