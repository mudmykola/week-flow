// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const writeEndpoints = [
  'server/api/projects/[id]/automations.post.ts',
  'server/api/projects/[id]/workflow.post.ts',
  'server/api/projects/[id]/workflow.patch.ts',
  'server/api/automations/[id].patch.ts',
  'server/api/automations/[id].delete.ts',
  'server/api/automations/[id]/test.post.ts',
  'server/api/workflow-stages/[id].patch.ts',
  'server/api/workflow-stages/[id].delete.ts'
]

describe('workflow management access', () => {
  it('requires PM or administrator access before every workflow mutation', () => {
    for (const path of writeEndpoints) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8')
      const guard = source.indexOf('await requireManager(event)')
      const databaseUse = source.indexOf('useDb(event)')

      expect(guard, `${path} must require manager access`).toBeGreaterThan(-1)
      expect(databaseUse === -1 || guard < databaseUse, `${path} must authorize before database access`).toBe(true)
    }
  })

  it('keeps read-only stage access available to project members', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/api/projects/[id]/workflow.get.ts'), 'utf8')
    expect(source).toContain('requireProjectAccess(event, id)')
    expect(source).not.toContain('requireManager(event)')
  })
})
