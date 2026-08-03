import type { ActivityFeedItem } from '~/domain/services/activityFeed'

export interface ActivityFiltersState {
  search: string
  action: string
  entity: string
  actor: string
  project: string
  period: string
}

export function useActivityFeed() {
  const items = ref<ActivityFeedItem[]>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const filters = reactive<ActivityFiltersState>({
    search: '',
    action: '',
    entity: '',
    actor: '',
    project: '',
    period: '30'
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
      nextCursor.value = response.nextCursor
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Activity load failed'
    } finally {
      pending.value = false
    }
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
  return { items, nextCursor, pending, loadingMore, error, filters, load, loadMore }
}
