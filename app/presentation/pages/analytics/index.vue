<script setup lang="ts">
import { fetchProjects } from '~/data/repositories/projectsRepository'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, TaskPriority, TaskStatus } from '~/domain/entities/task'
import {
  analyticsWeeks,
  averageGoalProgress,
  buildAnalyticsTrend,
  completionRate,
  countByStatus,
  countGoalsByStatus,
  filterAnalyticsTasks,
  type AnalyticsPeriod
} from '~/domain/services/analytics'
import { getCurrentWeek, getPrevWeek } from '~/domain/services/week'
import { priorityColors, priorityLabels, statusLabels } from '~/domain/services/taskLabels'
import { focusStats, type FocusSession } from '~/domain/services/focus'
import { localDateKey } from '~/domain/services/today'

const { t } = useI18n()
const goalsStore = useGoalsStore()
const tasks = ref<Task[]>([])
const projects = ref<Project[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const error = ref('')
const focusSessions = ref<FocusSession[]>([])
const filters = reactive<{
  period: AnalyticsPeriod
  projectId: string | null
  assigneeId: string | null
  priority: TaskPriority | null
}>({ period: '8w', projectId: null, assigneeId: null, priority: null })

const today = localDateKey()
const currentWeek = getCurrentWeek()
const previousWeek = getPrevWeek(currentWeek)

onMounted(loadDashboard)
useLiveRefresh('tasks', loadDashboard)
useLiveRefresh('goals', loadDashboard)
useLiveRefresh('projects', loadDashboard)

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    ;[tasks.value, projects.value, assignees.value, focusSessions.value] = await Promise.all([
      fetchAllTasks(),
      fetchProjects(),
      $fetch<AssignableUser[]>('/api/users/assignable'),
      $fetch<{ sessions: FocusSession[] }>('/api/focus').then((response) => response.sessions),
      goalsStore.loadGoals()
    ])
  } catch {
    error.value = t('pages.analytics.error')
  } finally {
    loading.value = false
  }
}

const filteredTasks = computed(() => filterAnalyticsTasks(tasks.value, filters))
const weeks = computed(() => analyticsWeeks(filteredTasks.value, currentWeek, filters.period))
const periodTasks = computed(() => filteredTasks.value.filter((task) => weeks.value.includes(task.week)))
const currentTasks = computed(() => filteredTasks.value.filter((task) => task.week === currentWeek))
const previousTasks = computed(() => filteredTasks.value.filter((task) => task.week === previousWeek))
const currentDone = computed(() => currentTasks.value.filter((task) => task.status === 'done').length)
const previousDone = computed(() => previousTasks.value.filter((task) => task.status === 'done').length)
const currentCompletion = computed(() => completionRate(currentTasks.value))
const previousCompletion = computed(() => completionRate(previousTasks.value))
const completionDelta = computed(() => currentCompletion.value - previousCompletion.value)
const overdue = computed(() =>
  periodTasks.value.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'done')
)
const trendData = computed(() => buildAnalyticsTrend(filteredTasks.value, weeks.value, today))
const statusCounts = computed(() => countByStatus(periodTasks.value))
const velocity = computed(() => trendData.value.slice(-4).reduce((sum, point) => sum + point.done, 0))
const focusSummary = computed(() => focusStats(focusSessions.value))

const statusItems = computed(() =>
  (
    [
      ['todo', '#94a3b8'],
      ['in_progress', '#3b82f6'],
      ['done', '#fe5011']
    ] as const
  ).map(([status, color]) => ({
    key: status,
    label: t(statusLabels[status]),
    value: statusCounts.value[status],
    color
  }))
)
const priorityItems = computed(() =>
  (['urgent', 'high', 'medium', 'low'] as const).map((priority) => ({
    key: priority,
    label: t(priorityLabels[priority]),
    value: periodTasks.value.filter((task) => task.priority === priority).length,
    color: priorityColors[priority]
  }))
)
const projectWorkload = computed(() =>
  projects.value
    .map((project) => ({
      ...project,
      count: periodTasks.value.filter((task) => task.projectId === project.id && task.status !== 'done').length,
      done: periodTasks.value.filter((task) => task.projectId === project.id && task.status === 'done').length
    }))
    .filter((item) => item.count || item.done)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
)
const attention = computed(() =>
  [
    ...overdue.value,
    ...periodTasks.value.filter(
      (task) =>
        task.priority === 'urgent' && task.status !== 'done' && !overdue.value.some((item) => item.id === task.id)
    )
  ].slice(0, 6)
)
const hasFilters = computed(() => Boolean(filters.projectId || filters.assigneeId || filters.priority))
const goalStatusCounts = computed(() => countGoalsByStatus(goalsStore.goals))
const avgGoalProgress = computed(() => averageGoalProgress(goalsStore.goals))
const goalBreakdownItems = computed(() => [
  { key: 'active', label: t('pages.analytics.goalsActive'), value: goalStatusCounts.value.active, color: '#3b82f6' },
  { key: 'done', label: t('pages.analytics.goalsDone'), value: goalStatusCounts.value.done, color: '#16a34a' }
])

function resetFilters() {
  filters.projectId = null
  filters.assigneeId = null
  filters.priority = null
}

function openTasks(extra: { week?: string; status?: TaskStatus; priority?: TaskPriority; project?: string } = {}) {
  return navigateTo({
    path: '/',
    query: {
      week: extra.week,
      project: extra.project ?? filters.projectId ?? undefined,
      assignee: filters.assigneeId ?? undefined,
      priority: extra.priority ?? filters.priority ?? undefined,
      status: extra.status
    }
  })
}
</script>

<template>
  <div class="analytics-page app-container">
    <PageHeader
      :title="$t('nav.analytics')"
      :description="$t('pages.analytics.description')"
      icon="i-lucide-chart-no-axes-combined"
    >
      <template #actions>
        <UButton
          variant="soft"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="loadDashboard"
        >
          {{ $t('pages.analytics.refresh') }}
        </UButton>
      </template>
    </PageHeader>

    <section
      class="analytics-page__filters section-card mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <UFormField :label="$t('pages.analytics.period')">
        <USelect
          v-model="filters.period"
          :items="[
            { label: $t('pages.analytics.eightWeeks'), value: '8w' },
            { label: $t('pages.analytics.allTime'), value: 'all' }
          ]"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('task.project')">
        <USelect
          v-model="filters.projectId"
          :items="[
            { label: $t('board.allProjects'), value: null },
            ...projects.map((project) => ({ label: project.name, value: project.id }))
          ]"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('task.assignee')">
        <USelect
          v-model="filters.assigneeId"
          :items="[
            { label: $t('pages.analytics.allAssignees'), value: null },
            ...assignees.map((person) => ({ label: person.name, value: person.id }))
          ]"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('task.priority')">
        <USelect
          v-model="filters.priority"
          :items="[
            { label: $t('board.allPriorities'), value: null },
            ...(['urgent', 'high', 'medium', 'low'] as const).map((priority) => ({
              label: $t(priorityLabels[priority]),
              value: priority
            }))
          ]"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UButton
        v-if="hasFilters"
        class="self-end"
        variant="ghost"
        color="neutral"
        icon="i-lucide-filter-x"
        @click="resetFilters"
      >
        {{ $t('pages.analytics.reset') }}
      </UButton>
    </section>

    <div
      v-if="loading"
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <USkeleton
        v-for="index in 4"
        :key="index"
        class="h-40 rounded-2xl"
      />
    </div>
    <EmptyState
      v-else-if="error"
      :title="$t('pages.analytics.unavailable')"
      :description="error"
      icon="i-lucide-cloud-off"
    >
      <UButton
        variant="soft"
        @click="loadDashboard"
      >
        {{ $t('common.tryAgain') }}
      </UButton>
    </EmptyState>
    <template v-else>
      <section class="analytics-page__metrics grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          :label="$t('pages.analytics.weekTasks')"
          :value="currentTasks.length"
          icon="i-lucide-list-checks"
          :hint="$t('pages.analytics.weekTasksHint')"
        />
        <MetricCard
          :label="$t('pages.analytics.completed')"
          :value="currentDone"
          icon="i-lucide-circle-check-big"
          tone="success"
          :trend="`${currentDone >= previousDone ? '+' : '−'}${Math.abs(currentDone - previousDone)}`"
          :hint="$t('pages.analytics.comparison')"
        />
        <MetricCard
          :label="$t('pages.analytics.velocity')"
          :value="velocity"
          icon="i-lucide-gauge"
          :hint="$t('pages.analytics.velocityHint')"
        />
        <MetricCard
          :label="$t('pages.analytics.weekProgress')"
          :value="`${currentCompletion}%`"
          icon="i-lucide-trending-up"
          :tone="currentCompletion >= 70 ? 'success' : 'accent'"
          :trend="`${completionDelta > 0 ? '+' : completionDelta < 0 ? '−' : ''}${Math.abs(completionDelta)}%`"
          :hint="$t('pages.analytics.completionHint')"
        />
        <MetricCard
          :label="$t('pages.analytics.focusMinutes')"
          :value="focusSummary.minutesToday"
          icon="i-lucide-timer"
          :hint="$t('pages.analytics.focusMinutesHint', { count: focusSummary.completedToday })"
        />
      </section>

      <section class="analytics-page__primary mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,.75fr)]">
        <article class="section-card min-w-0">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-lg">{{ $t('pages.analytics.trend') }}</h2>
              <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.trendHintV2') }}</p>
            </div>
            <UBadge
              color="neutral"
              variant="soft"
              >{{ weeks.length }} {{ $t('pages.analytics.weeks') }}</UBadge
            >
          </div>
          <ClientOnly>
            <LazyTrendChart :data="trendData" />
            <template #fallback>
              <USkeleton class="h-[300px] rounded-xl" />
            </template>
          </ClientOnly>
          <div class="mt-2 flex flex-wrap gap-2">
            <UButton
              v-for="point in trendData.slice(-4)"
              :key="point.week"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-up-right"
              @click="openTasks({ week: point.week })"
            >
              {{ point.label }} · {{ point.done }}/{{ point.created }}
            </UButton>
          </div>
        </article>
        <article class="section-card min-w-0">
          <h2 class="font-display text-lg">{{ $t('pages.analytics.statuses') }}</h2>
          <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.activeTasks') }}</p>
          <ClientOnly>
            <LazyDonutBreakdown
              class="mt-3"
              :items="statusItems"
              @select="openTasks({ status: $event.key as TaskStatus })"
            />
            <template #fallback>
              <USkeleton class="mt-3 h-[250px] rounded-xl" />
            </template>
          </ClientOnly>
        </article>
      </section>

      <section class="analytics-page__secondary mt-4 grid gap-4 lg:grid-cols-2">
        <article class="section-card min-w-0">
          <h2 class="font-display text-lg">{{ $t('pages.analytics.priorities') }}</h2>
          <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.prioritiesHint') }}</p>
          <ClientOnly>
            <LazyBarBreakdown
              class="mt-3"
              :items="priorityItems"
              @select="openTasks({ priority: $event.key as TaskPriority })"
            />
            <template #fallback>
              <USkeleton class="mt-3 h-[280px] rounded-xl" />
            </template>
          </ClientOnly>
        </article>
        <article class="section-card">
          <h2 class="font-display text-lg">{{ $t('pages.analytics.activeProjects') }}</h2>
          <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.activeProjectsHint') }}</p>
          <BoundedTaskList
            v-if="projectWorkload.length"
            class="mt-5"
            :count="projectWorkload.length"
            :preview="5"
            :row-height="66"
            storage-key="analytics-projects"
          >
            <div class="space-y-3">
              <button
                v-for="project in projectWorkload"
                :key="project.id"
                type="button"
                class="w-full rounded-xl border border-transparent p-2 text-left transition hover:border-[var(--color-panel-border)] hover:bg-[var(--color-bg-alt)]"
                @click="openTasks({ project: project.id })"
              >
                <span class="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span class="flex min-w-0 items-center gap-2 font-medium">
                    <span
                      class="size-2.5 shrink-0 rounded-full"
                      :style="{ background: project.color }"
                    />
                    <span class="truncate">{{ project.name }}</span>
                  </span>
                  <span class="text-secondary shrink-0 text-xs"
                    >{{ project.done }} / {{ project.count + project.done }}</span
                  >
                </span>
                <span class="block h-2 overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
                  <span
                    class="block h-full rounded-full"
                    :style="{
                      width: `${(project.done / Math.max(project.count + project.done, 1)) * 100}%`,
                      background: project.color
                    }"
                  />
                </span>
              </button>
            </div>
          </BoundedTaskList>
          <p
            v-else
            class="text-secondary py-16 text-center text-sm"
          >
            {{ $t('pages.analytics.noProjects') }}
          </p>
        </article>
      </section>

      <section class="analytics-page__goals mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article class="section-card min-w-0">
          <h2 class="font-display text-lg">{{ $t('pages.analytics.goalsBreakdown') }}</h2>
          <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.goalsBreakdownHint') }}</p>
          <ClientOnly>
            <LazyBarBreakdown
              class="mt-3"
              :items="goalBreakdownItems"
              @select="navigateTo('/goals')"
            />
            <template #fallback>
              <USkeleton class="mt-3 h-[280px] rounded-xl" />
            </template>
          </ClientOnly>
        </article>
        <div class="grid gap-4">
          <MetricCard
            :label="$t('pages.analytics.goalsActive')"
            :value="goalStatusCounts.active"
            icon="i-lucide-target"
          />
          <MetricCard
            :label="$t('pages.analytics.goalsAvgProgress')"
            :value="`${avgGoalProgress}%`"
            icon="i-lucide-trending-up"
            tone="accent"
          />
        </div>
      </section>

      <section class="analytics-page__attention section-card mt-4">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg">{{ $t('pages.analytics.attention') }}</h2>
            <p class="text-secondary mt-1 text-sm">{{ $t('pages.analytics.attentionHint') }}</p>
          </div>
          <UButton
            to="/overdue"
            size="sm"
            variant="soft"
            color="error"
            icon="i-lucide-triangle-alert"
          >
            {{ overdue.length }} {{ $t('pages.analytics.viewAll') }}
          </UButton>
        </div>
        <BoundedTaskList
          v-if="attention.length"
          :count="attention.length"
          :preview="6"
          :row-height="48"
          storage-key="analytics-attention"
        >
          <div class="divide-y divide-[var(--color-panel-border)]">
            <button
              v-for="task in attention"
              :key="task.id"
              type="button"
              class="flex w-full items-center gap-3 py-3 text-left"
              @click="openTasks({ week: task.week, priority: task.priority })"
            >
              <PriorityBadge :priority="task.priority" />
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ task.title }}</span>
              <span class="text-secondary text-xs">{{ task.dueDate || $t(priorityLabels[task.priority]) }}</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="text-secondary size-4"
              />
            </button>
          </div>
        </BoundedTaskList>
        <p
          v-else
          class="text-secondary py-8 text-center text-sm"
        >
          {{ $t('pages.analytics.underControl') }}
        </p>
      </section>
    </template>
  </div>
</template>
