import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flatten(child as Record<string, unknown>, path)
      : [path]
  })
}

describe('i18n locale contracts', () => {
  it('keeps Ukrainian and English message keys in sync', async () => {
    const [uk, en] = await Promise.all(
      ['uk', 'en'].map(async (code) =>
        JSON.parse(await readFile(resolve(process.cwd(), 'i18n', 'locales', `${code}.json`), 'utf8'))
      )
    )
    expect(flatten(en).sort()).toEqual(flatten(uk).sort())
  })

  it('keeps Ukrainian user-facing text out of runtime source files', async () => {
    const roots = ['app', 'server']
    const violations: string[] = []
    for (const root of roots) {
      const files = await readdir(resolve(process.cwd(), root), { recursive: true })
      for (const file of files.filter((name) => /\.(?:vue|ts|js|mjs)$/.test(name))) {
        const path = resolve(process.cwd(), root, file)
        const source = await readFile(path, 'utf8')
        if (/[А-Яа-яІіЇїЄє]/.test(source)) violations.push(`${root}/${file}`)
      }
    }
    expect(violations).toEqual([])
  })
})
