type CacheEntry<T> = {
  expiresAt: number
  value: Promise<T>
}

export function createAsyncTtlCache<T>(ttlMs: number, maxEntries = 500) {
  const entries = new Map<string, CacheEntry<T>>()

  return {
    get(key: string, loader: () => Promise<T>, now = Date.now()) {
      const cached = entries.get(key)
      if (cached && cached.expiresAt > now) return cached.value

      if (entries.size >= maxEntries) prune(entries, now, maxEntries)
      const value = loader().catch((error) => {
        entries.delete(key)
        throw error
      })
      entries.set(key, { expiresAt: now + ttlMs, value })
      return value
    },
    delete(key: string) {
      entries.delete(key)
    },
    clear() {
      entries.clear()
    }
  }
}

function prune<T>(entries: Map<string, CacheEntry<T>>, now: number, maxEntries: number) {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key)
  }
  while (entries.size >= maxEntries) {
    const oldest = entries.keys().next().value
    if (oldest === undefined) break
    entries.delete(oldest)
  }
}
