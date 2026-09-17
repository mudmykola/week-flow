<script setup lang="ts">
import type { ActivityFeedItem } from '~/domain/services/activityFeed'
import type { AssignableUser } from '~/domain/entities/task'
import {
  activityNeedsAttention,
  groupActivityByDate,
  isActivityMove,
  summarizeActivity,
  type ActivitySummary
} from '~/domain/services/activityFeed'

const {
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
} = useActivityFeed()
const route = useRoute()
Object.assign(filters, {
  search: typeof route.query.search === 'string' ? route.query.search : '',
  action: typeof route.query.action === 'string' ? route.query.action : '',
  entity: typeof route.query.entity === 'string' ? route.query.entity : '',
  actor: typeof route.query.actor === 'string' ? route.query.actor : '',
  project: typeof route.query.project === 'string' ? route.query.project : '',
  period: typeof route.query.period === 'string' ? (route.query.period === 'all' ? '' : route.query.period) : '30',
  scope: ['mine', 'team', 'all'].includes(String(route.query.scope)) ? route.query.scope : 'mine'
})
const projectsStore = useProjectsStore()
const actors = ref<AssignableUser[]>([])
const signal = ref<keyof ActivitySummary | null>(null)
const lastSeen = ref(0)
const visibleItems = computed(() => {
  if (signal.value === 'attention') return items.value.filter(activityNeedsAttention)
  if (signal.value === 'completed')
    return items.value.filter((item) => item.action === 'subtask.completed' || item.metadata.status === 'done')
  if (signal.value === 'moved') return items.value.filter(isActivityMove)
  if (signal.value === 'conversations')
    return items.value.filter((item) => item.action === 'comment.created' || item.metadata.mentioned)
  return items.value
})
const groups = computed(() => groupActivityByDate(visibleItems.value))
const summary = computed(() => summarizeActivity(items.value))
const attention = computed(() => items.value.filter(activityNeedsAttention))
const hasFilters = computed(() =>
  Boolean(
    filters.search ||
    filters.action ||
    filters.entity ||
    filters.actor ||
    filters.project ||
    filters.period !== '30' ||
    signal.value
  )
)
await Promise.all([
  load(),
  projectsStore.loadProjects().catch(() => undefined),
  $fetch<AssignableUser[]>('/api/users/assignable')
    .then((value) => (actors.value = value))
    .catch(() => undefined)
])
onMounted(() => {
  lastSeen.value = Number(localStorage.getItem('weekflow-activity-last-seen') || 0)
  localStorage.setItem('weekflow-activity-last-seen', String(Date.now()))
})
useIntervalFn(() => void checkForNew(), 60_000, { immediate: false })
useLiveRefresh('tasks', checkForNew)
useLiveRefresh('goals', checkForNew)
useLiveRefresh('projects', checkForNew)
watch(
  filters,
  useDebounceFn(() => {
    void navigateTo(
      {
        query: {
          search: filters.search || undefined,
          action: filters.action || undefined,
          entity: filters.entity || undefined,
          actor: filters.actor || undefined,
          project: filters.project || undefined,
          period: filters.period === '30' ? undefined : filters.period || 'all',
          scope: filters.scope === 'mine' ? undefined : filters.scope
        }
      },
      { replace: true }
    )
  }, 300),
  { deep: true }
)

function updateFilters(value: typeof filters) {
  Object.assign(filters, value)
}
function clearFilters() {
  Object.assign(filters, { search: '', action: '', entity: '', actor: '', project: '', period: '30' })
  signal.value = null
}
function openEntity(item: ActivityFeedItem) {
  if (item.entityType === 'task' && item.action !== 'task.deleted') {
    void navigateTo({ path: '/', query: { task: item.entityId } })
  } else if (item.entityType === 'goal') {
    void navigateTo('/goals')
  }
}
function exportCsv() {
  if (!import.meta.client || !items.value.length) return
  const query = new URLSearchParams({ format: 'csv', scope: filters.scope })
  for (const key of ['search', 'action', 'entity', 'actor', 'project', 'period'] as const) {
    if (filters[key]) query.set(key, filters[key])
  }
  window.location.assign(`/api/activity?${query}`)
}
function selectSignal(kind: keyof ActivitySummary) {
  signal.value = signal.value === kind ? null : kind
}
</script>

<template>
  <div class="activity-page app-container">
    <PageHeader
      :title="$t('pages.activity.title')"
      :description="$t('pages.activity.description')"
      icon="i-lucide-activity"
      :count="visibleItems.length"
    >
      <template #actions>
        <AppButton
          variant="ghost"
          icon="i-lucide-download"
          :disabled="!items.length"
          @click="exportCsv"
        >
          {{ $t('pages.activity.export') }}
        </AppButton>
        <AppButton
          variant="secondary"
          icon="i-lucide-refresh-cw"
          :disabled="pending"
          @click="load"
        >
          {{ $t('pages.activity.refresh') }}
        </AppButton>
      </template>
    </PageHeader>

    <div class="activity-page__scope-row">
      <ActivityScopeTabs v-model="filters.scope" />
      <p>{{ $t(`pages.activity.scopeHints.${filters.scope}`) }}</p>
    </div>

    <ActivitySummary
      :summary="summary"
      @select="selectSignal"
    />

    <ActivityAttentionQueue
      :items="attention"
      @open="openEntity"
    />

    <ActivityFilters
      :model-value="filters"
      :actors="actors"
      :projects="projectsStore.projects"
      @update:model-value="updateFilters"
    />

    <button
      v-if="incoming.length"
      class="activity-page__new-events"
      @click="applyIncoming"
    >
      <UIcon name="i-lucide-arrow-up" />{{ $t('pages.activity.newEvents', { count: incoming.length }) }}
    </button>

    <div
      v-if="pending"
      class="activity-page__skeleton mt-5 space-y-3"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="skeleton h-20 rounded-xl"
      />
    </div>

    <section
      v-else-if="error"
      class="surface-card mt-5 flex flex-col items-center gap-3 p-8 text-center"
    >
      <span class="page-icon"><UIcon name="i-lucide-cloud-alert" /></span>
      <div>
        <h2 class="font-semibold">{{ $t('pages.activity.loadError') }}</h2>
        <p class="text-secondary mt-1 text-sm">{{ $t('pages.activity.loadErrorHint') }}</p>
      </div>
      <AppButton
        variant="secondary"
        icon="i-lucide-refresh-cw"
        @click="load"
        >{{ $t('common.tryAgain') }}</AppButton
      >
    </section>

    <div
      v-else-if="groups.length"
      class="activity-page__feed surface-card mt-3 px-3 sm:px-5"
    >
      <ActivityDateGroup
        v-for="group in groups"
        :key="group.key"
        :group="group"
        :last-seen="lastSeen"
        @open="openEntity"
      />
      <div
        v-if="nextCursor"
        class="border-t border-[var(--color-panel-border)] py-4 text-center"
      >
        <AppButton
          variant="secondary"
          icon="i-lucide-chevrons-down"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? $t('common.loading') : $t('pages.activity.loadMore') }}
        </AppButton>
      </div>
    </div>

    <EmptyState
      v-else
      class="mt-5"
      :title="hasFilters ? $t('pages.activity.noMatches') : $t('pages.activity.empty')"
      :description="hasFilters ? $t('pages.activity.noMatchesHint') : $t('pages.activity.emptyHint')"
      icon="i-lucide-history"
    >
      <AppButton
        v-if="hasFilters"
        variant="secondary"
        icon="i-lucide-list-restart"
        @click="clearFilters"
      >
        {{ $t('pages.activity.clearFilters') }}
      </AppButton>
    </EmptyState>
  </div>
</template>

<style scoped src="~/presentation/assets/css/pages/activity.css"></style>
