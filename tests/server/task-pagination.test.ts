// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { decodeTaskCursor, encodeTaskCursor } from '../../server/utils/taskPagination'

describe('task cursor pagination', () => {
  it('round-trips a stable createdAt and id cursor', () => {
    const cursor = encodeTaskCursor({ createdAt: 1_786_680_000_000, id: 'task-1' })
    expect(decodeTaskCursor(cursor)).toEqual({ createdAt: 1_786_680_000_000, id: 'task-1' })
  })

  it.each(['', 'invalid', '-1_task', 'NaN_task', '123_'])('rejects malformed cursor %s', (cursor) => {
    expect(decodeTaskCursor(cursor)).toBeNull()
  })
})
