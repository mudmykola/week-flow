<script setup lang="ts">
import {
  addDays,
  addMonths,
  endOfISOWeek,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfISOWeek,
  startOfMonth,
  subMonths
} from 'date-fns'
import { enUS, uk } from 'date-fns/locale'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Task, TaskPriority, TaskStatus } from '~/domain/entities/task'
import { calendarTaskSummary, filterCalendarTasks } from '~/domain/services/calendar'
import { priorityColors } from '~/domain/services/taskLabels'

const projectsStore = useProjectsStore()
const { locale, rt, tm, t } = useI18n()
const tasks = ref<Task[]>([])
const loading = ref(true)
const error = ref(false)
const cursor = ref(startOfMonth(new Date()))
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'))
const view = useLocalStorage<'month' | 'agenda'>('weekflow-calendar-view', 'month')
const projectFilter = ref<string | null>(null)
const priorityFilter = ref<TaskPriority | null>(null)
const statusFilter = ref<TaskStatus | null>(null)
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const statuses: TaskStatus[] = ['todo', 'in_progress', 'done']
const today = format(new Date(), 'yyyy-MM-dd')
const dateLocale = computed(() => (locale.value === 'en' ? enUS : uk))

taskCreatedBus.on((task) => {
  if (task.dueDate && !task.archivedAt && !tasks.value.some((item) => item.id === task.id)) tasks.value.push(task)
})

onMounted(load)

async function load() {
  loading.value = true
  error.value = false
  try {
    const loadedTasks = await fetchAllTasks()
    tasks.value = loadedTasks.filter((task) => task.dueDate && !task.archivedAt)
    await projectsStore.loadProjects().catch(() => undefined)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const title = computed(() => format(cursor.value, 'LLLL yyyy', { locale: dateLocale.value }))
const weekdays = computed(() =>
  (tm('pages.calendar.weekdays') as Array<Parameters<typeof rt>[0]>).map((day) => rt(day))
)
const dates = computed(() => {
  const start = startOfISOWeek(startOfMonth(cursor.value))
  const end = endOfISOWeek(endOfMonth(cursor.value))
  const result: Date[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) result.push(date)
  return result
})
const filteredTasks = computed(() =>
  filterCalendarTasks(tasks.value, {
    projectId: projectFilter.value,
    priority: priorityFilter.value,
    status: statusFilter.value
  })
)
const tasksByDate = computed(() => Object.groupBy(filteredTasks.value, (task) => task.dueDate!))
const monthPrefix = computed(() => format(cursor.value, 'yyyy-MM'))
const summary = computed(() => calendarTaskSummary(filteredTasks.value, monthPrefix.value, today))
const monthAgenda = computed(() =>
  Object.entries(tasksByDate.value)
    .filter(([date]) => date.startsWith(monthPrefix.value))
    .sort(([left], [right]) => left.localeCompare(right))
)
const selectedTasks = computed(() => tasksByDate.value[selectedDate.value] ?? [])
const hasFilters = computed(() => Boolean(projectFilter.value || priorityFilter.value || statusFilter.value))

function goToToday() {
  cursor.value = startOfMonth(new Date())
  selectedDate.value = today
}
function selectDay(date: Date) {
  selectedDate.value = format(date, 'yyyy-MM-dd')
  if (!isSameMonth(date, cursor.value)) cursor.value = startOfMonth(date)
}
function clearFilters() {
  projectFilter.value = null
  priorityFilter.value = null
  statusFilter.value = null
}
function dateLabel(date: string, pattern = 'EEEE, d MMMM') {
  return format(parseISO(date), pattern, { locale: dateLocale.value })
}
function boardLink(task: Task) {
  return { path: '/', query: { week: task.week, project: task.projectId ?? undefined, priority: task.priority } }
}
</script>

<template>
  <div class="calendar-page app-container">
    <PageHeader
      :title="$t('nav.calendar')"
      :description="$t('pages.calendar.description')"
      icon="i-lucide-calendar-days"
    >
      <template #actions>
        <div
          class="calendar-page__view-switch"
          role="group"
          :aria-label="$t('pages.calendar.view')"
        >
          <button
            type="button"
            class="calendar-page__view-button"
            :class="{ 'calendar-page__view-button--active': view === 'month' }"
            @click="view = 'month'"
          >
            <UIcon name="i-lucide-calendar-range" />{{ $t('pages.calendar.month') }}
          </button>
          <button
            type="button"
            class="calendar-page__view-button"
            :class="{ 'calendar-page__view-button--active': view === 'agenda' }"
            @click="view = 'agenda'"
          >
            <UIcon name="i-lucide-list" />{{ $t('pages.calendar.agenda') }}
          </button>
        </div>
      </template>
    </PageHeader>

    <section class="calendar-toolbar surface-card">
      <div class="calendar-toolbar__navigation">
        <IconButton
          icon="i-lucide-chevron-left"
          :label="$t('pages.calendar.previous')"
          @click="cursor = subMonths(cursor, 1)"
        />
        <div class="calendar-toolbar__period">
          <strong>{{ title }}</strong
          ><span>{{ summary.total }} {{ $t('pages.calendar.deadlines') }}</span>
        </div>
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('pages.calendar.next')"
          @click="cursor = addMonths(cursor, 1)"
        />
        <AppButton
          size="sm"
          icon="i-lucide-locate-fixed"
          @click="goToToday"
          >{{ $t('pages.calendar.today') }}</AppButton
        >
      </div>
      <div class="calendar-toolbar__filters">
        <FormSelect
          v-model="projectFilter"
          :aria-label="$t('pages.calendar.filterProject')"
          :placeholder="$t('pages.calendar.allProjects')"
        >
          <option
            v-for="project in projectsStore.projects"
            :key="project.id"
            :value="project.id"
          >
            {{ project.name }}
          </option>
        </FormSelect>
        <FormSelect
          v-model="priorityFilter"
          :aria-label="$t('pages.calendar.filterPriority')"
          :placeholder="$t('pages.calendar.allPriorities')"
        >
          <option
            v-for="priority in priorities"
            :key="priority"
            :value="priority"
          >
            {{ $t(`task.priorityValue.${priority}`) }}
          </option>
        </FormSelect>
        <FormSelect
          v-model="statusFilter"
          :aria-label="$t('pages.calendar.filterStatus')"
          :placeholder="$t('pages.calendar.allStatuses')"
        >
          <option
            v-for="status in statuses"
            :key="status"
            :value="status"
          >
            {{ $t(`task.statusValue.${status}`) }}
          </option>
        </FormSelect>
        <IconButton
          v-if="hasFilters"
          icon="i-lucide-filter-x"
          :label="$t('pages.calendar.clearFilters')"
          @click="clearFilters"
        />
      </div>
    </section>

    <div class="calendar-summary">
      <AppSurface class="calendar-metric"
        ><UIcon name="i-lucide-calendar-clock" />
        <div>
          <span>{{ $t('pages.calendar.monthDeadlines') }}</span
          ><strong>{{ summary.total }}</strong>
        </div></AppSurface
      >
      <AppSurface class="calendar-metric"
        ><UIcon name="i-lucide-circle-dot" />
        <div>
          <span>{{ $t('pages.calendar.open') }}</span
          ><strong>{{ summary.open }}</strong>
        </div></AppSurface
      >
      <AppSurface class="calendar-metric calendar-metric--success"
        ><UIcon name="i-lucide-circle-check" />
        <div>
          <span>{{ $t('common.done') }}</span
          ><strong>{{ summary.done }}</strong>
        </div></AppSurface
      >
      <AppSurface
        class="calendar-metric"
        :class="{ 'calendar-metric--danger': summary.overdue }"
        ><UIcon name="i-lucide-triangle-alert" />
        <div>
          <span>{{ $t('pages.calendar.overdue') }}</span
          ><strong>{{ summary.overdue }}</strong>
        </div></AppSurface
      >
    </div>

    <USkeleton
      v-if="loading"
      class="h-[38rem] rounded-2xl"
    />
    <EmptyState
      v-else-if="error"
      :title="$t('pages.calendar.loadError')"
      :description="$t('pages.calendar.loadErrorHint')"
      icon="i-lucide-triangle-alert"
      ><AppButton
        icon="i-lucide-refresh-cw"
        @click="load"
        >{{ $t('common.tryAgain') }}</AppButton
      ></EmptyState
    >

    <div
      v-else-if="view === 'month'"
      class="calendar-layout"
    >
      <section class="calendar-month surface-card">
        <div class="calendar-month__weekdays">
          <div
            v-for="day in weekdays"
            :key="day"
          >
            {{ day }}
          </div>
        </div>
        <div class="calendar-month__grid">
          <button
            v-for="date in dates"
            :key="date.toISOString()"
            type="button"
            class="calendar-day"
            :class="{
              'calendar-day--outside': !isSameMonth(date, cursor),
              'calendar-day--selected': format(date, 'yyyy-MM-dd') === selectedDate,
              'calendar-day--today': format(date, 'yyyy-MM-dd') === today
            }"
            @click="selectDay(date)"
          >
            <span class="calendar-day__number">{{ format(date, 'd') }}</span
            ><span
              v-if="tasksByDate[format(date, 'yyyy-MM-dd')]?.length"
              class="calendar-day__count"
              >{{ tasksByDate[format(date, 'yyyy-MM-dd')]?.length }}</span
            >
            <span class="calendar-day__tasks">
              <span
                v-for="task in (tasksByDate[format(date, 'yyyy-MM-dd')] || []).slice(0, 3)"
                :key="task.id"
                class="calendar-task-chip"
                :class="{ 'calendar-task-chip--done': task.status === 'done' }"
                ><i :style="{ background: priorityColors[task.priority] }" /><span>{{ task.title }}</span></span
              >
              <span
                v-if="(tasksByDate[format(date, 'yyyy-MM-dd')]?.length || 0) > 3"
                class="calendar-day__more"
                >+{{ tasksByDate[format(date, 'yyyy-MM-dd')]!.length - 3 }} {{ $t('pages.calendar.more') }}</span
              >
            </span>
          </button>
        </div>
      </section>

      <aside class="calendar-details surface-card">
        <header class="calendar-details__header">
          <span>{{ dateLabel(selectedDate, 'd MMMM') }}</span
          ><small>{{ selectedDate === today ? $t('pages.calendar.today') : dateLabel(selectedDate, 'EEEE') }}</small>
        </header>
        <div
          v-if="selectedTasks.length"
          class="calendar-details__list"
        >
          <NuxtLink
            v-for="task in selectedTasks"
            :key="task.id"
            :to="boardLink(task)"
            class="calendar-detail-task"
          >
            <span
              class="calendar-detail-task__priority"
              :style="{ background: priorityColors[task.priority] }"
            />
            <div>
              <strong :class="{ 'line-through opacity-60': task.status === 'done' }">{{ task.title }}</strong
              ><small
                >{{ projectsStore.getProject(task.projectId)?.name ?? $t('task.noProject') }} ·
                {{ $t(`task.statusValue.${task.status}`) }}</small
              >
            </div>
            <UIcon name="i-lucide-arrow-up-right" />
          </NuxtLink>
        </div>
        <EmptyState
          v-else
          :title="$t('pages.calendar.noTasks')"
          :description="$t('pages.calendar.noTasksHint')"
          icon="i-lucide-calendar-plus"
        />
      </aside>
    </div>

    <section
      v-else
      class="calendar-agenda surface-card"
    >
      <div
        v-if="monthAgenda.length"
        class="calendar-agenda__list"
      >
        <article
          v-for="[date, dayTasks] in monthAgenda"
          :key="date"
          class="calendar-agenda__day"
        >
          <header>
            <strong>{{ format(parseISO(date), 'd') }}</strong>
            <div>
              <span>{{ dateLabel(date, 'EEEE') }}</span
              ><small>{{ dateLabel(date, 'MMMM') }}</small>
            </div>
            <em>{{ dayTasks?.length }}</em>
          </header>
          <div class="calendar-agenda__tasks">
            <NuxtLink
              v-for="task in dayTasks"
              :key="task.id"
              :to="boardLink(task)"
              class="calendar-detail-task"
              ><span
                class="calendar-detail-task__priority"
                :style="{ background: priorityColors[task.priority] }" />
              <div>
                <strong :class="{ 'line-through opacity-60': task.status === 'done' }">{{ task.title }}</strong
                ><small
                  >{{ projectsStore.getProject(task.projectId)?.name ?? $t('task.noProject') }} ·
                  {{ $t(`task.priorityValue.${task.priority}`) }}</small
                >
              </div>
              <UIcon name="i-lucide-chevron-right"
            /></NuxtLink>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        :title="$t('pages.calendar.emptyMonth')"
        :description="$t('pages.calendar.emptyMonthHint')"
        icon="i-lucide-calendar-x"
      />
    </section>
  </div>
</template>

<style scoped>
.calendar-page__view-switch,
.calendar-toolbar__navigation,
.calendar-toolbar__filters,
.calendar-metric,
.calendar-details__header,
.calendar-detail-task,
.calendar-agenda__day > header {
  display: flex;
  align-items: center;
}
.calendar-page__view-switch {
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
}
.calendar-page__view-button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border-radius: 0.55rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}
.calendar-page__view-button--active {
  background: var(--color-bg-alt);
  color: var(--text-primary);
}
.calendar-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.65rem;
}
.calendar-toolbar__navigation,
.calendar-toolbar__filters {
  gap: 0.4rem;
}
.calendar-toolbar__period {
  min-width: 9rem;
  text-align: center;
}
.calendar-toolbar__period strong {
  display: block;
  text-transform: capitalize;
}
.calendar-toolbar__period span {
  color: var(--text-secondary);
  font-size: 0.7rem;
}
.calendar-toolbar__filters .form-select {
  min-width: 8rem;
}
.calendar-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}
.calendar-metric {
  gap: 0.65rem;
  padding: 0.7rem;
}
.calendar-metric > svg {
  color: var(--text-secondary);
}
.calendar-metric span {
  display: block;
  color: var(--text-secondary);
  font-size: 0.7rem;
}
.calendar-metric strong {
  font-size: 1.15rem;
}
.calendar-metric--success > svg {
  color: #22c55e;
}
.calendar-metric--danger > svg {
  color: #ef4444;
}
.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  gap: 0.75rem;
}
.calendar-month {
  overflow: hidden;
  padding: 0;
}
.calendar-month__weekdays,
.calendar-month__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.calendar-month__weekdays {
  border-bottom: 1px solid var(--color-panel-border);
  background: var(--color-bg-alt);
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
}
.calendar-month__weekdays > div {
  padding: 0.65rem;
}
.calendar-day {
  position: relative;
  min-height: 7.6rem;
  padding: 0.55rem;
  border-right: 1px solid var(--color-panel-border);
  border-bottom: 1px solid var(--color-panel-border);
  text-align: left;
  transition: background 0.15s;
}
.calendar-day:hover,
.calendar-day--selected {
  background: var(--color-bg-alt);
}
.calendar-day--selected {
  box-shadow: inset 0 0 0 1px var(--color-accent);
}
.calendar-day--outside {
  opacity: 0.4;
}
.calendar-day__number {
  display: grid;
  width: 1.6rem;
  height: 1.6rem;
  place-items: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}
.calendar-day--today .calendar-day__number {
  background: var(--color-accent);
  color: white;
}
.calendar-day__count {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  color: var(--text-secondary);
  font-size: 0.65rem;
}
.calendar-day__tasks {
  display: grid;
  gap: 0.2rem;
  margin-top: 0.3rem;
}
.calendar-task-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.25rem 0.35rem;
  border-radius: 0.35rem;
  background: var(--color-bg-alt);
  font-size: 0.68rem;
}
.calendar-task-chip i {
  width: 0.35rem;
  height: 0.35rem;
  flex: none;
  border-radius: 50%;
}
.calendar-task-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-task-chip--done {
  text-decoration: line-through;
  opacity: 0.55;
}
.calendar-day__more {
  padding-left: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.62rem;
}
.calendar-details {
  align-self: start;
  position: sticky;
  top: 1rem;
  padding: 0.8rem;
}
.calendar-details__header {
  justify-content: space-between;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--color-panel-border);
  font-weight: 700;
  text-transform: capitalize;
}
.calendar-details__header small {
  color: var(--text-secondary);
  font-weight: 500;
}
.calendar-details__list,
.calendar-agenda__tasks {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.6rem;
}
.calendar-detail-task {
  gap: 0.55rem;
  padding: 0.6rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.6rem;
}
.calendar-detail-task:hover {
  background: var(--color-bg-alt);
}
.calendar-detail-task__priority {
  width: 0.25rem;
  height: 2rem;
  flex: none;
  border-radius: 1rem;
}
.calendar-detail-task > div {
  min-width: 0;
  flex: 1;
}
.calendar-detail-task strong,
.calendar-detail-task small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-detail-task strong {
  font-size: 0.78rem;
}
.calendar-detail-task small {
  margin-top: 0.15rem;
  color: var(--text-secondary);
  font-size: 0.65rem;
}
.calendar-agenda {
  padding: 0.8rem;
}
.calendar-agenda__list {
  display: grid;
  gap: 0.8rem;
}
.calendar-agenda__day {
  display: grid;
  grid-template-columns: 9rem 1fr;
  gap: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--color-panel-border);
}
.calendar-agenda__day > header {
  gap: 0.6rem;
  align-self: start;
}
.calendar-agenda__day > header > strong {
  display: grid;
  width: 2.4rem;
  height: 2.4rem;
  place-items: center;
  border-radius: 0.65rem;
  background: var(--color-bg-alt);
}
.calendar-agenda__day header span,
.calendar-agenda__day header small {
  display: block;
  text-transform: capitalize;
}
.calendar-agenda__day header small {
  color: var(--text-secondary);
  font-size: 0.65rem;
}
.calendar-agenda__day header em {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-style: normal;
}
@media (max-width: 900px) {
  .calendar-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .calendar-toolbar__filters {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  .calendar-layout {
    grid-template-columns: 1fr;
  }
  .calendar-details {
    position: static;
  }
  .calendar-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .calendar-page__view-button {
    font-size: 0;
  }
  .calendar-page__view-button svg {
    width: 1.1rem;
    height: 1.1rem;
  }
  .calendar-toolbar__navigation {
    justify-content: space-between;
  }
  .calendar-toolbar__period {
    min-width: 0;
  }
  .calendar-toolbar__filters {
    grid-template-columns: 1fr;
  }
  .calendar-month {
    overflow-x: auto;
  }
  .calendar-month__weekdays,
  .calendar-month__grid {
    min-width: 42rem;
  }
  .calendar-day {
    min-height: 6.5rem;
  }
  .calendar-agenda__day {
    grid-template-columns: 1fr;
  }
  .calendar-summary {
    gap: 0.4rem;
  }
  .calendar-metric {
    padding: 0.55rem;
  }
}
</style>
