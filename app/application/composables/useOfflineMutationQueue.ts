import { normalizeAppError } from '~/domain/errors/appError'
import { compactOfflineQueue, type OfflineMutation } from '~/domain/services/offlineQueue'

export function useOfflineMutationQueue() {
  const queue = useLocalStorage<OfflineMutation[]>('weekflow-offline-mutations-v1', [])
  const syncing = useState('weekflow:offline-syncing', () => false)
  const conflict = useState<OfflineMutation | null>('weekflow:offline-conflict', () => null)
  const online = useOnline()
  const pending = computed(() => queue.value.length)

  function enqueue(input: Omit<OfflineMutation, 'id' | 'createdAt'>) {
    const mutation = { ...input, id: crypto.randomUUID(), createdAt: Date.now() }
    queue.value = compactOfflineQueue(queue.value, mutation)
    return mutation
  }

  async function capture<T>(input: Omit<OfflineMutation, 'id' | 'createdAt'>, execute: () => Promise<T>, fallback: T) {
    try {
      return await execute()
    } catch (cause) {
      const error = normalizeAppError(cause)
      // A server or rate-limit response does not prove that the mutation was
      // not processed. Replaying it could duplicate a write, so only queue
      // requests that failed before an HTTP response existed.
      if (online.value || error.code !== 'network' || !import.meta.client) throw cause
      enqueue(input)
      return fallback
    }
  }

  async function flush() {
    if (syncing.value || conflict.value || !online.value || !queue.value.length) return
    syncing.value = true
    try {
      while (queue.value.length && online.value) {
        const mutation = queue.value[0]!
        try {
          await $fetch(mutation.url, { method: mutation.method, body: mutation.body })
          queue.value = queue.value.slice(1)
          broadcastSync('tasks')
        } catch (cause) {
          const error = normalizeAppError(cause)
          if (error.code === 'conflict') conflict.value = mutation
          if (error.retryable || error.code === 'conflict') break
          queue.value = queue.value.slice(1)
        }
      }
    } finally {
      syncing.value = false
    }
  }

  function discardConflict() {
    const id = conflict.value?.id
    if (id) queue.value = queue.value.filter((item) => item.id !== id)
    conflict.value = null
    void flush()
  }

  watch(online, (value) => value && void flush())
  tryOnMounted(() => void flush())
  return { queue, pending, syncing, conflict, enqueue, capture, flush, discardConflict }
}
