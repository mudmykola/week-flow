// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('repository hygiene', () => {
  it('keeps local Claude and backlog workspace artifacts out of Git', () => {
    const ignore = readFileSync('.gitignore', 'utf8')

    for (const pattern of ['.claude/', 'claude/', 'CLAUDE*.md', 'BACKLOG*.md', 'backlog/']) {
      expect(ignore).toContain(pattern)
    }
  })
})
