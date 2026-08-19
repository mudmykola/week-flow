import type { ActivityFeedItem, ActivityScope } from '~/domain/services/activityFeed'

export interface ActivityFiltersState {
  search: string
  action: string
  entity: string
  actor: string
  project: string
  period: string
  scope: ActivityScope
}

export function useActivityFeed() {
  const items = ref<ActivityFeedItem[]>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const incoming = ref<ActivityFeedItem[]>([])
  const filters = reactive<ActivityFiltersState>({
    search: '',
    action: '',
    entity: '',
    actor: '',
    project: '',
    period: '30',
    scope: 'mine'
  })

  async function request(cursor?: string | null) {
    return $fetch<{ items: ActivityFeedItem[]; nextCursor: string | null }>('/api/activity', {
      query: {
        search: filters.search || undefined,
        action: filters.action || undefined,
        entity: filters.entity || undefined,
        actor: filters.actor || undefined,
        project: filters.project || undefined,
        period: filters.period || undefined,
        scope: filters.scope,
        cursor: cursor || undefined
      }
    })
  }

  async function load() {
    pending.value = true
    error.value = null
    try {
      const response = await request()
      items.value = response.items
      incoming.value = []
      nextCursor.value = response.nextCursor
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Activity load failed'
    } finally {
      pending.value = false
    }
  }

  async function checkForNew() {
    if (pending.value || loadingMore.value) return
    try {
      const response = await request()
      const existing = new Set(items.value.map((item) => item.id))
      incoming.value = response.items.filter((item) => !existing.has(item.id))
    } catch {
      // Background refresh must never replace a usable feed with an error state.
    }
  }

  function applyIncoming() {
    const known = new Set(items.value.map((item) => item.id))
    items.value = [...incoming.value.filter((item) => !known.has(item.id)), ...items.value]
    incoming.value = []
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const response = await request(nextCursor.value)
      items.value.push(...response.items)
      nextCursor.value = response.nextCursor
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Activity load failed'
    } finally {
      loadingMore.value = false
    }
  }

  const refresh = useDebounceFn(load, 250)
  watch(filters, refresh, { deep: true })
  return {
    items,
    incoming,
    nextCursor,
    pending,
    loadingMore,
    error,
    filters,
    load,
    loadMore,
    checkForNew,
    applyIncoming
  }
}
