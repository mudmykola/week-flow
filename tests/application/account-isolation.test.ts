import { describe, expect, it } from 'vitest'
import {
  accountStorageScopeKey,
  releaseAccountStorage,
  switchAccountStorage
} from '~/application/composables/useAccountIsolation'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() {
    return this.values.size
  }
  clear() {
    this.values.clear()
  }
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('account-scoped browser state', () => {
  it('moves task data out of shared keys and restores only the next account data', () => {
    const storage = new MemoryStorage()
    storage.setItem(accountStorageScopeKey, 'account-a')
    storage.setItem('weekflow-task-draft-v2', '{"title":"A private task"}')
    storage.setItem('weekflow-offline-mutations-v1', '[{"url":"/api/tasks/private"}]')
    storage.setItem('weekflow-review-draft-2026-08-14', 'A private review')
    storage.setItem('weekflow-account:account-b:weekflow-task-draft-v2', '{"title":"B task"}')

    expect(switchAccountStorage(storage, 'account-b')).toBe(true)
    expect(storage.getItem('weekflow-task-draft-v2')).toBe('{"title":"B task"}')
    expect(storage.getItem('weekflow-review-draft-2026-08-14')).toBeNull()
    expect(storage.getItem('weekflow-offline-mutations-v1')).toBeNull()
    expect(storage.getItem('weekflow-account:account-a:weekflow-task-draft-v2')).toContain('A private task')
    expect(storage.getItem('weekflow-account:account-a:weekflow-review-draft-2026-08-14')).toBe('A private review')
    expect(storage.getItem('weekflow-account:account-a:weekflow-offline-mutations-v1')).toContain('/api/tasks/private')
  })

  it('releases active account data on logout and restores it on the same account login', () => {
    const storage = new MemoryStorage()
    storage.setItem(accountStorageScopeKey, 'account-a')
    storage.setItem('weekflow-focus-task', 'task-secret')

    releaseAccountStorage(storage)
    expect(storage.getItem(accountStorageScopeKey)).toBeNull()
    expect(storage.getItem('weekflow-focus-task')).toBeNull()

    expect(switchAccountStorage(storage, 'account-a')).toBe(false)
    expect(storage.getItem('weekflow-focus-task')).toBe('task-secret')
  })
})
