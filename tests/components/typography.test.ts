// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Ukrainian-first typography system', () => {
  const typography = source('app/presentation/assets/css/typography.css')
  const main = source('app/presentation/assets/css/main.css')
  const packageJson = source('package.json')

  it('self-hosts variable Onest with Ukrainian Cyrillic and Latin subsets', () => {
    expect(packageJson).toContain('"@fontsource-variable/onest"')
    expect(typography).toContain('onest-cyrillic-wght-normal.woff2')
    expect(typography).toContain('onest-latin-wght-normal.woff2')
    expect(typography).toContain('U+0490-0491')
    expect(typography).toContain('font-display: swap')
  })

  it('uses shared typography tokens for body, controls and display text', () => {
    expect(main).toContain("@import './typography.css'")
    expect(main).toContain('font-family: var(--font-body)')
    expect(main).toContain('font-family: var(--font-display)')
    expect(main).not.toMatch(/font-family:\s*Inter/)
    expect(typography).toContain('font: inherit')
    expect(typography).toContain('--tracking-display: -0.015em')
  })
})
