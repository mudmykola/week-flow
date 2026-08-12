import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentSource = (path: string) =>
  readFileSync(resolve(process.cwd(), 'app/presentation/components', path), 'utf8')

describe('button architecture', () => {
  it('keeps the native button in the global primitive only', () => {
    expect(componentSource('base/AppButton.vue')).toContain('<button')

    for (const component of ['base/IconButton.vue', 'analytics/ChartLegendButton.vue']) {
      const source = componentSource(component)
      expect(source).toContain('<AppButton')
      expect(source).not.toContain('<button')
    }
  })
})
