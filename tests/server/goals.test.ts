// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { computeLinkedProgress } from '../../server/utils/goals'

describe('computeLinkedProgress', () => {
  it('falls back to the stored progress when the project has no tasks', () => {
    expect(computeLinkedProgress(0, 0, 40, 'active')).toEqual({ progress: 40, status: 'active' })
  })

  it('computes progress from done/total and stays active below 100%', () => {
    expect(computeLinkedProgress(1, 4, 0, 'active')).toEqual({ progress: 25, status: 'active' })
  })

  it('marks the goal done once every task is complete', () => {
    expect(computeLinkedProgress(4, 4, 0, 'active')).toEqual({ progress: 100, status: 'done' })
  })

  it('keeps a manually completed goal done even if computed progress drops below 100%', () => {
    expect(computeLinkedProgress(2, 4, 100, 'done')).toEqual({ progress: 50, status: 'done' })
  })
})
