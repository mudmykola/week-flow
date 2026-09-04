// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'app/presentation/pages/about/index.vue'), 'utf8')
const authMiddleware = readFileSync(resolve(process.cwd(), 'app/middleware/auth.global.ts'), 'utf8')
const sidebar = readFileSync(resolve(process.cwd(), 'app/presentation/components/shell/ShellSidebar.vue'), 'utf8')

describe('developer page', () => {
  it('is public and reachable from the authenticated shell', () => {
    expect(authMiddleware).toContain("'/about'")
    expect(sidebar).toContain('to="/about"')
  })

  it('contains developer, product, contact and responsive presentation contracts', () => {
    expect(page).toContain("$t('pages.about.developerName')")
    expect(page).toContain('https://github.com/mudmykola')
    expect(page).toContain('mailto:mykola.mud@gmail.com')
    expect(page).toContain('lg:grid-cols')
    expect(page).toContain("t('pages.about.productTitle')")
    expect(page).toContain('useSeoMeta')
  })
})
