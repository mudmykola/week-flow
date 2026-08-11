<script setup lang="ts">
import type { ActivityFeedItem } from '~/domain/services/activityFeed'
import type { AssignableUser } from '~/domain/entities/task'
import { groupActivityByDate } from '~/domain/services/activityFeed'

const { items, nextCursor, pending, loadingMore, error, filters, load, loadMore } = useActivityFeed()
const projectsStore = useProjectsStore()
const actors = ref<AssignableUser[]>([])
const groups = computed(() => groupActivityByDate(items.value))
const hasFilters = computed(() =>
  Boolean(
    filters.search || filters.action || filters.entity || filters.actor || filters.project || filters.period !== '30'
  )
)
await Promise.all([
  load(),
  projectsStore.loadProjects().catch(() => undefined),
  $fetch<AssignableUser[]>('/api/users/assignable')
    .then((value) => (actors.value = value))
    .catch(() => undefined)
])
useIntervalFn(() => void load(), 60_000, { immediate: false })
useLiveRefresh('tasks', load)
useLiveRefresh('goals', load)
useLiveRefresh('projects', load)

function updateFilters(value: typeof filters) {
  Object.assign(filters, value)
}
function clearFilters() {
  Object.assign(filters, { search: '', action: '', entity: '', actor: '', project: '', period: '30' })
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
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = items.value.map((item) =>
    [new Date(item.createdAt).toISOString(), item.actorName, item.action, item.entityTitle, item.projectName]
      .map(escape)
      .join(',')
  )
  const csv = ['date,actor,action,entity,project', ...rows].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `weekflow-activity-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="activity-page app-container max-w-6xl">
    <PageHeader
      :title="$t('pages.activity.title')"
      :description="$t('pages.activity.description')"
      icon="i-lucide-activity"
      :count="items.length"
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

    <ActivityFilters
      :model-value="filters"
      :actors="actors"
      :projects="projectsStore.projects"
      @update:model-value="updateFilters"
    />

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
      class="activity-page__feed surface-card mt-5 px-4 sm:px-6"
    >
      <ActivityDateGroup
        v-for="group in groups"
        :key="group.key"
        :group="group"
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
