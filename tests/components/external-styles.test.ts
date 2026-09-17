// @vitest-environment node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const presentationRoot = path.resolve('app/presentation')

function vueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return vueFiles(target)
    return entry.name.endsWith('.vue') ? [target] : []
  })
}

describe('external presentation styles', () => {
  const files = vueFiles(presentationRoot)

  it('keeps CSS declarations outside Vue files', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, path.relative(presentationRoot, file)).not.toMatch(/<style(?:\s+scoped)?>([\s\S]*?)<\/style>/)
    }
  })

  it('resolves every external style source to a non-empty CSS file', () => {
    const references = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return [...source.matchAll(/<style(?:\s+scoped)?\s+src="([^"]+)"\s*><\/style>/g)].map((match) => ({
        file,
        source: match[1]!
      }))
    })

    expect(references.length).toBeGreaterThanOrEqual(50)
    for (const reference of references) {
      const cssFile = path.resolve(reference.source.replace(/^~\//, 'app/'))
      expect(existsSync(cssFile), path.relative(presentationRoot, reference.file)).toBe(true)
      expect(readFileSync(cssFile, 'utf8').trim().length, reference.source).toBeGreaterThan(0)
    }
  })

  it('stores analytics component styles in the matching feature directory', () => {
    const component = readFileSync(path.join(presentationRoot, 'components/analytics/ChartLegendButton.vue'), 'utf8')
    expect(component).toContain('src="~/presentation/assets/css/components/analytics/chart-legend-button.css"')
  })
})
