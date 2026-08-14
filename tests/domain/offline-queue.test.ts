import { describe, expect, it } from 'vitest'
import { compactOfflineQueue, type OfflineMutation } from '~/domain/services/offlineQueue'

const mutation = (input: Partial<OfflineMutation> & Pick<OfflineMutation, 'id' | 'url' | 'method'>) => ({
  createdAt: 1,
  ...input
})

describe('offline mutation queue', () => {
  it('merges consecutive patches for the same resource without losing fields', () => {
    const first = mutation({ id: 'one', url: '/api/tasks/task-1', method: 'PATCH', body: { title: 'A' } })
    const second = mutation({
      id: 'two',
      url: '/api/tasks/task-1',
      method: 'PATCH',
      body: { status: 'done' },
      createdAt: 2
    })

    expect(compactOfflineQueue([first], second)).toEqual([
      expect.objectContaining({ id: 'two', body: { title: 'A', status: 'done' } })
    ])
  })

  it('lets delete supersede queued changes for the same resource', () => {
    const patch = mutation({ id: 'one', url: '/api/notes/note-1', method: 'PATCH', body: { text: 'Draft' } })
    const remove = mutation({ id: 'two', url: '/api/notes/note-1', method: 'DELETE' })

    expect(compactOfflineQueue([patch], remove)).toEqual([remove])
  })

  it('preserves mutation order for different resources', () => {
    const first = mutation({ id: 'one', url: '/api/tasks/task-1', method: 'PATCH' })
    const second = mutation({ id: 'two', url: '/api/tasks/task-2', method: 'PATCH' })

    expect(compactOfflineQueue([first], second)).toEqual([first, second])
  })
})
