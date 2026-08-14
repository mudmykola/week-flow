import type { InboxItem } from '~/domain/entities/inbox'

export const accountStorageScopeKey = 'weekflow-account-scope-v1'
export const accountStorageKeys = [
  'weekflow-task-draft-v2',
  'weekflow-reusable-tags',
  'weekflow-task-defaults',
  'weekflow-task-templates',
  'weekflow-focus-task',
  'weekflow-focus-queue',
  'weekflow-focus-timer-v2',
  'weekflow-calendar-filters-v3',
  'weekflow-today-filters-v1',
  'weekflow-offline-mutations-v1'
]
export const accountStoragePrefixes = ['weekflow-review-draft-']

const scopedKey = (accountId: string, key: string) => `weekflow-account:${accountId}:${key}`

function storageKeys(storage: Storage) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string =>
    Boolean(key)
  )
}

function accountKeys(storage: Storage) {
  return storageKeys(storage).filter(
    (key) => accountStorageKeys.includes(key) || accountStoragePrefixes.some((prefix) => key.startsWith(prefix))
  )
}

export function saveAccountStorage(storage: Storage, accountId: string) {
  for (const key of accountKeys(storage)) {
    const value = storage.getItem(key)
    if (value !== null) storage.setItem(scopedKey(accountId, key), value)
    storage.removeItem(key)
  }
}

export function restoreAccountStorage(storage: Storage, accountId: string) {
  const prefix = `weekflow-account:${accountId}:`
  const saved = storageKeys(storage).filter((key) => key.startsWith(prefix))
  for (const key of saved) {
    const value = storage.getItem(key)
    if (value !== null) storage.setItem(key.slice(prefix.length), value)
  }
}

export function switchAccountStorage(storage: Storage, accountId: string) {
  const previousId = storage.getItem(accountStorageScopeKey)
  if (previousId === accountId) return false
  if (previousId) saveAccountStorage(storage, previousId)
  if (previousId || storageKeys(storage).some((key) => key.startsWith(`weekflow-account:${accountId}:`))) {
    for (const key of accountKeys(storage)) storage.removeItem(key)
    restoreAccountStorage(storage, accountId)
  }
  storage.setItem(accountStorageScopeKey, accountId)
  return Boolean(previousId && previousId !== accountId)
}

export function releaseAccountStorage(storage: Storage) {
  const accountId = storage.getItem(accountStorageScopeKey)
  if (accountId) saveAccountStorage(storage, accountId)
  storage.removeItem(accountStorageScopeKey)
}

export function useAccountIsolation() {
  const tasks = useTasksStore()
  const projects = useProjectsStore()
  const goals = useGoalsStore()
  const focus = useFocusTimer()
  const inboxItems = useState<InboxItem[]>('inbox-items', () => [])
  const activeId = useState<string | null>('weekflow:active-account-id', () => null)

  function resetMemory() {
    tasks.reset()
    projects.reset()
    goals.reset()
    focus.clear()
    inboxItems.value = []
  }

  function bind(accountId: string | null | undefined) {
    if (!accountId) return
    const changed = import.meta.client ? switchAccountStorage(localStorage, accountId) : Boolean(activeId.value)
    if ((activeId.value && activeId.value !== accountId) || changed) resetMemory()
    activeId.value = accountId
  }

  function clear() {
    resetMemory()
    if (import.meta.client) releaseAccountStorage(localStorage)
    activeId.value = null
  }

  return { bind, clear }
}
