<script setup lang="ts">
import { parseISO } from 'date-fns'
import { createTask, fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '~/domain/entities/task'
import {
  calendarMinutes,
  calendarTaskSummary,
  conflictingTaskIds,
  filterCalendarTasks,
  taskCalendarDate
} from '~/domain/services/calendar'
import { dateToWeek } from '~/domain/services/week'
import type { CalendarView } from '~/application/composables/useCalendarCursor'

const route = useRoute()
const { t } = useI18n()
const projectsStore = useProjectsStore()
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const error = ref(false)
const saving = ref(false)
const undoAction = ref<null | { task: Task; label: string }>(null)
const quickTitle = ref('')
const capacityMinutes = 8 * 60
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const statuses: TaskStatus[] = ['todo', 'in_progress', 'done']
const hours = Array.from({ length: 10 }, (_, index) => index + 8)
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')
const view = useLocalStorage<CalendarView>('weekflow-calendar-view-v3', 'month')

const { filters, hasFilters, clearFilters } = useCalendarFilters()

const calendarTasks = computed(() => tasks.value.filter((task) => !task.archivedAt))
const filteredTasks = computed(() => filterCalendarTasks(calendarTasks.value, filters.value))
const taskDate = (task: Task) => taskCalendarDate(task)
const tasksByDate = computed(() => Object.groupBy(filteredTasks.value, (task) => taskDate(task)!))
const unscheduled = computed(() =>
  calendarTasks.value
    .filter((task) => task.status !== 'done' && !task.plannedDate)
    .filter(
      (task) =>
        (!filters.value.projectId || task.projectId === filters.value.projectId) &&
        (!filters.value.priority || task.priority === filters.value.priority) &&
        (!filters.value.status || task.status === filters.value.status) &&
        (!filters.value.assigneeId || task.assigneeId === filters.value.assigneeId)
    )
    .sort((left, right) => (left.dueDate || '9999').localeCompare(right.dueDate || '9999'))
)

const {
  today,
  cursor,
  selectedDate,
  dateLocale,
  monthDates,
  weekStart,
  weekDays,
  weekDateKeys,
  agendaDays,
  monthPrefix,
  title,
  weekdays,
  goToday,
  changePeriod,
  selectDate,
  moveSelected
} = useCalendarCursor({ view, tasksByDate })

const selectedTasks = computed(() => (tasksByDate.value[selectedDate.value] || []).slice().sort(sortByTime))
const selectedMinutes = computed(() =>
  calendarMinutes(selectedTasks.value.filter((task) => task.plannedDate === selectedDate.value))
)
const selectedPercent = computed(() => Math.min(100, Math.round((selectedMinutes.value / capacityMinutes) * 100)))
const selectedConflicts = computed(() => conflictingTaskIds(selectedTasks.value))
const allConflicts = computed(() => {
  const ids = new Set<string>()
  for (const items of Object.values(tasksByDate.value)) for (const id of conflictingTaskIds(items || [])) ids.add(id)
  return ids
})
const summary = computed(() => calendarTaskSummary(filteredTasks.value, monthPrefix.value, today))

const { editorOpen, editingTask, editorDate, openNew, openTask, closeEditor, createFromEditor, openFromQuery } =
  useCalendarTaskEditor({ sync, today })

const { draggingId, drag, drop, unschedule } = useCalendarDragDrop({ tasks, patchTask })

const { smartOpen, smartPlan, prepareSmartPlan, applySmartPlan } = useSmartPlan({
  calendarTasks,
  weekDateKeys,
  sync,
  saving
})

onMounted(async () => {
  const requestedView = route.query.view
  if (requestedView === 'timeline') view.value = 'week'
  else if (requestedView === 'month' || requestedView === 'week' || requestedView === 'agenda')
    view.value = requestedView
  if (window.innerWidth < 640 && !localStorage.getItem('weekflow-calendar-view-v3')) view.value = 'agenda'
  await load()
  openFromQuery(tasks.value)
})
watch(view, (next) => {
  void navigateTo({ query: { ...route.query, view: next === 'month' ? undefined : next } }, { replace: true })
})
useLiveRefresh('tasks', load)
taskCreatedBus.on(sync)
onKeyStroke('t', (event) => {
  if ((event.target as HTMLElement | null)?.matches('input, textarea, select, [contenteditable="true"]')) return
  goToday()
})
onKeyStroke('ArrowLeft', (event) => moveSelected(event, -1))
onKeyStroke('ArrowRight', (event) => moveSelected(event, 1))

async function load() {
  loading.value = true
  error.value = false
  try {
    tasks.value = await fetchAllTasks()
    const [people] = await Promise.all([
      $fetch<AssignableUser[]>('/api/users/assignable').catch(() => []),
      projectsStore.projects.length ? Promise.resolve() : projectsStore.loadProjects().catch(() => undefined)
    ])
    assignees.value = people
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
function sync(task: Task) {
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index === -1) tasks.value.push(task)
  else tasks.value[index] = task
}
function sortByTime(left: Task, right: Task) {
  return (left.plannedTime || '99:99').localeCompare(right.plannedTime || '99:99')
}
async function quickCreate() {
  const title = quickTitle.value.trim()
  if (!title || saving.value) return
  saving.value = true
  try {
    sync(
      await createTask({
        title,
        note: null,
        status: 'todo',
        projectId: filters.value.projectId,
        priority: 'medium',
        dueDate: null,
        plannedDate: selectedDate.value,
        plannedTime: null,
        assigneeId: filters.value.assigneeId,
        estimateMinutes: null,
        recurrence: null,
        tags: [],
        week: dateToWeek(parseISO(selectedDate.value))
      })
    )
    quickTitle.value = ''
    broadcastSync('tasks')
  } finally {
    saving.value = false
  }
}
async function patchTask(task: Task, patch: UpdateTaskInput, label = t('pages.calendar.moved')) {
  if (saving.value) return
  const before = { ...task }
  sync({ ...task, ...patch })
  saving.value = true
  try {
    sync(await updateTask(task.id, patch))
    undoAction.value = { task: before, label }
    broadcastSync('tasks')
  } catch (cause) {
    sync(before)
    throw cause
  } finally {
    saving.value = false
  }
}
async function undo() {
  const action = undoAction.value
  undoAction.value = null
  if (!action) return
  sync(await updateTask(action.task.id, action.task))
  broadcastSync('tasks')
}
async function setTop(task: Task) {
  const used = new Set(selectedTasks.value.filter((item) => item.id !== task.id).map((item) => item.dayRank))
  const rank = task.dayRank ? null : ([1, 2, 3].find((value) => !used.has(value)) ?? 3)
  await patchTask(task, { dayRank: rank }, t('pages.calendar.topUpdated'))
}
</script>

<template>
  <div class="calendar-workspace">
    <PageHeader
      :title="$t('nav.calendar')"
      :description="$t('pages.calendar.descriptionV3')"
      icon="i-lucide-calendar-days"
    >
      <template #actions>
        <AppButton
          icon="i-lucide-wand-sparkles"
          variant="secondary"
          @click="prepareSmartPlan"
          >{{ $t('pages.calendar.smartPlan') }}</AppButton
        >
      </template>
    </PageHeader>

    <CalendarToolbar
      v-model:view="view"
      :title="title"
      :total="summary.total"
      @previous="changePeriod(-1)"
      @next="changePeriod(1)"
      @today="goToday"
    />

    <CalendarFiltersBar
      v-model:filters="filters"
      :projects="projectsStore.projects"
      :assignees="assignees"
      :priorities="priorities"
      :statuses="statuses"
      :has-filters="hasFilters"
      @clear="clearFilters"
    />

    <CalendarSummary
      :total="summary.total"
      :unscheduled="unscheduled.length"
      :conflicts="allConflicts.size"
      :selected-minutes="selectedMinutes"
    />

    <USkeleton
      v-if="loading"
      class="h-[38rem] rounded-2xl"
    />
    <EmptyState
      v-else-if="error"
      :title="$t('pages.calendar.loadError')"
      :description="$t('pages.calendar.loadErrorHint')"
      icon="i-lucide-triangle-alert"
      ><AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton></EmptyState
    >
    <div
      v-else
      class="calendar-workspace__body"
    >
      <CalendarBacklog
        :tasks="unscheduled"
        @drag="drag"
        @drop="unschedule"
        @open="openTask"
      />

      <main class="calendar-workspace__main">
        <CalendarMonthView
          v-if="view === 'month'"
          :weekdays="weekdays"
          :month-dates="monthDates"
          :cursor="cursor"
          :selected-date="selectedDate"
          :today="today"
          :tasks-by-date="tasksByDate"
          :conflicts="allConflicts"
          @select="selectDate"
          @create="openNew"
          @drag="drag"
          @drop="drop"
          @open="openTask"
        />
        <CalendarWeekView
          v-else-if="view === 'week'"
          :week-days="weekDays"
          :today="today"
          :date-locale="dateLocale"
          :hours="hours"
          :tasks-by-date="tasksByDate"
          :conflicts="allConflicts"
          @select="selectDate"
          @create="openNew"
          @drag="drag"
          @drop="drop"
          @open="openTask"
        />
        <CalendarAgendaView
          v-else
          :agenda-days="agendaDays"
          :tasks-by-date="tasksByDate"
          :assignees="assignees"
          :date-locale="dateLocale"
          @select="selectDate"
          @open="openTask"
          @drag="drag"
        />
      </main>

      <CalendarDayPanel
        v-model:quick-title="quickTitle"
        :selected-date="selectedDate"
        :date-locale="dateLocale"
        :saving="saving"
        :selected-minutes="selectedMinutes"
        :selected-percent="selectedPercent"
        :selected-conflicts="selectedConflicts"
        :selected-tasks="selectedTasks"
        @create-new="openNew(selectedDate)"
        @quick-create="quickCreate"
        @open="openTask"
        @set-top="setTop"
      />
    </div>

    <div
      v-if="undoAction"
      class="calendar-undo"
    >
      <span>{{ undoAction.label }}</span
      ><button @click="undo">{{ $t('common.undo') }}</button>
    </div>
    <TaskEditor
      :open="editorOpen"
      :task="editingTask"
      :default-planned-date="editorDate"
      :projects="projectsStore.projects"
      :assignees="assignees"
      @close="closeEditor"
      @save="createFromEditor"
      @updated="sync"
    />
    <CalendarSmartPlanModal
      :open="smartOpen"
      :plan="smartPlan"
      :tasks="tasks"
      :saving="saving"
      @close="smartOpen = false"
      @apply="applySmartPlan"
    />
  </div>
</template>
