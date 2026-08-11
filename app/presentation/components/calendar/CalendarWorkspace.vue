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
import { createTask, fetchAllTasks, updateTask } from '~/data/repositories/tasksRepository'
import type { Project } from '~/domain/entities/project'
import type {
  AssignableUser,
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput
} from '~/domain/entities/task'
import {
  buildSmartSchedule,
  calendarMinutes,
  calendarTaskSummary,
  conflictingTaskIds,
  filterCalendarTasks,
  taskCalendarDate,
  type CalendarPlan
} from '~/domain/services/calendar'
import { localDateKey } from '~/domain/services/today'
import { dateToWeek } from '~/domain/services/week'
import { priorityColors } from '~/domain/services/taskLabels'

type View = 'month' | 'week' | 'agenda'
type Filters = {
  projectId: string | null
  priority: TaskPriority | null
  status: TaskStatus | null
  assigneeId: string | null
}

const route = useRoute()
const { locale, rt, tm, t } = useI18n()
const projectsStore = useProjectsStore()
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const error = ref(false)
const saving = ref(false)
const cursor = ref(startOfMonth(new Date()))
const selectedDate = ref(localDateKey())
const view = useLocalStorage<View>('weekflow-calendar-view-v3', 'month')
const filters = useLocalStorage<Filters>('weekflow-calendar-filters-v3', {
  projectId: null,
  priority: null,
  status: null,
  assigneeId: null
})
const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const editorDate = ref<string | null>(null)
const draggingId = ref<string | null>(null)
const undoAction = ref<null | { task: Task; label: string }>(null)
const smartOpen = ref(false)
const smartPlan = ref<CalendarPlan[]>([])
const quickTitle = ref('')
const today = localDateKey()
const capacityMinutes = 8 * 60
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const statuses: TaskStatus[] = ['todo', 'in_progress', 'done']
const hours = Array.from({ length: 10 }, (_, index) => index + 8)
const dateLocale = computed(() => (locale.value === 'en' ? enUS : uk))
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')

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
const monthDates = computed(() => {
  const dates: Date[] = []
  for (
    let date = startOfISOWeek(startOfMonth(cursor.value));
    date <= endOfISOWeek(endOfMonth(cursor.value));
    date = addDays(date, 1)
  )
    dates.push(date)
  return dates
})
const weekStart = computed(() => startOfISOWeek(parseISO(selectedDate.value)))
const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart.value, index)))
const weekDateKeys = computed(() => weekDays.value.map((date) => format(date, 'yyyy-MM-dd')))
const agendaDays = computed(() => {
  const start = view.value === 'agenda' ? startOfISOWeek(parseISO(selectedDate.value)) : startOfMonth(cursor.value)
  const length = view.value === 'agenda' ? 14 : 31
  return Array.from({ length }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd')).filter(
    (date) => tasksByDate.value[date]?.length
  )
})
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
const monthPrefix = computed(() => format(cursor.value, 'yyyy-MM'))
const summary = computed(() => calendarTaskSummary(filteredTasks.value, monthPrefix.value, today))
const title = computed(() =>
  view.value === 'week'
    ? `${format(weekStart.value, 'd MMM', { locale: dateLocale.value })} — ${format(addDays(weekStart.value, 6), 'd MMM yyyy', { locale: dateLocale.value })}`
    : format(cursor.value, 'LLLL yyyy', { locale: dateLocale.value })
)
const weekdays = computed(() =>
  (tm('pages.calendar.weekdays') as Array<Parameters<typeof rt>[0]>).map((day) => rt(day))
)
const hasFilters = computed(() => Object.values(filters.value).some(Boolean))

onMounted(async () => {
  const requestedView = route.query.view
  if (requestedView === 'timeline') view.value = 'week'
  else if (requestedView === 'month' || requestedView === 'week' || requestedView === 'agenda')
    view.value = requestedView
  if (window.innerWidth < 640 && !localStorage.getItem('weekflow-calendar-view-v3')) view.value = 'agenda'
  await load()
  if (typeof route.query.task === 'string') {
    const task = tasks.value.find((item) => item.id === route.query.task)
    if (task) openTask(task, false)
  }
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
function dateLabel(date: string, pattern = 'EEEE, d MMMM') {
  return format(parseISO(date), pattern, { locale: dateLocale.value })
}
function project(task: Task): Project | null {
  return projectsStore.getProject(task.projectId)
}
function assignee(task: Task) {
  return assignees.value.find((person) => person.id === task.assigneeId)
}
function clearFilters() {
  Object.assign(filters.value, { projectId: null, priority: null, status: null, assigneeId: null })
}
function goToday() {
  selectedDate.value = today
  cursor.value = startOfMonth(new Date())
}
function changePeriod(step: number) {
  if (view.value === 'week' || view.value === 'agenda')
    selectedDate.value = format(addDays(parseISO(selectedDate.value), step * 7), 'yyyy-MM-dd')
  else cursor.value = step > 0 ? addMonths(cursor.value, 1) : subMonths(cursor.value, 1)
}
function selectDate(date: string) {
  selectedDate.value = date
  const parsed = parseISO(date)
  if (!isSameMonth(parsed, cursor.value)) cursor.value = startOfMonth(parsed)
}
function moveSelected(event: KeyboardEvent, amount: number) {
  if ((event.target as HTMLElement | null)?.matches('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  selectDate(format(addDays(parseISO(selectedDate.value), amount), 'yyyy-MM-dd'))
}
function openNew(date: string, time: string | null = null) {
  editingTask.value = null
  editorDate.value = date
  editorOpen.value = true
  if (time) sessionStorage.setItem('weekflow-calendar-create-time', time)
}
function openTask(task: Task, query = true) {
  editingTask.value = task
  editorDate.value = task.plannedDate || task.dueDate
  editorOpen.value = true
  if (query) void navigateTo({ query: { ...route.query, task: task.id } }, { replace: true })
}
function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
  const query = { ...route.query }
  delete query.task
  void navigateTo({ query, replace: true })
}
async function createFromEditor(payload: Omit<CreateTaskInput, 'week'>) {
  const time = sessionStorage.getItem('weekflow-calendar-create-time')
  sessionStorage.removeItem('weekflow-calendar-create-time')
  sync(
    await createTask({
      ...payload,
      plannedDate: payload.plannedDate || editorDate.value,
      plannedTime: time || payload.plannedTime,
      week: dateToWeek(parseISO(payload.plannedDate || editorDate.value || today))
    })
  )
  broadcastSync('tasks')
  closeEditor()
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
function drag(task: Task) {
  draggingId.value = task.id
}
async function drop(date: string, time: string | null = null) {
  const task = tasks.value.find((item) => item.id === draggingId.value)
  draggingId.value = null
  if (task)
    await patchTask(task, {
      plannedDate: date,
      plannedTime: time ?? task.plannedTime,
      week: dateToWeek(parseISO(date))
    })
}
async function unschedule() {
  const task = tasks.value.find((item) => item.id === draggingId.value)
  draggingId.value = null
  if (task) await patchTask(task, { plannedDate: null, plannedTime: null }, t('pages.calendar.unscheduledDone'))
}
async function setTop(task: Task) {
  const used = new Set(selectedTasks.value.filter((item) => item.id !== task.id).map((item) => item.dayRank))
  const rank = task.dayRank ? null : ([1, 2, 3].find((value) => !used.has(value)) ?? 3)
  await patchTask(task, { dayRank: rank }, t('pages.calendar.topUpdated'))
}
function prepareSmartPlan() {
  smartPlan.value = buildSmartSchedule(
    calendarTasks.value,
    weekDateKeys.value.filter((_, index) => index < 5)
  )
  smartOpen.value = true
}
async function applySmartPlan() {
  saving.value = true
  try {
    const updated = await Promise.all(
      smartPlan.value.map((plan) =>
        updateTask(plan.taskId, {
          plannedDate: plan.plannedDate,
          plannedTime: plan.plannedTime,
          estimateMinutes: plan.estimateMinutes,
          week: dateToWeek(parseISO(plan.plannedDate))
        })
      )
    )
    updated.forEach(sync)
    smartOpen.value = false
    broadcastSync('tasks')
  } finally {
    saving.value = false
  }
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

    <section class="calendar-toolbar surface-card">
      <div class="calendar-toolbar__navigation">
        <IconButton
          icon="i-lucide-chevron-left"
          :label="$t('pages.calendar.previous')"
          @click="changePeriod(-1)"
        />
        <div class="calendar-toolbar__period">
          <strong>{{ title }}</strong
          ><span>{{ summary.total }} {{ $t('pages.calendar.tasks') }}</span>
        </div>
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('pages.calendar.next')"
          @click="changePeriod(1)"
        />
        <AppButton
          size="sm"
          icon="i-lucide-locate-fixed"
          @click="goToday"
          >{{ $t('pages.calendar.today') }}</AppButton
        >
      </div>
      <div
        class="calendar-workspace__views"
        role="group"
        :aria-label="$t('pages.calendar.view')"
      >
        <button
          v-for="option in ['month', 'week', 'agenda'] as View[]"
          :key="option"
          :class="{ 'is-active': view === option }"
          @click="view = option"
        >
          <UIcon
            :name="
              option === 'month'
                ? 'i-lucide-calendar-range'
                : option === 'week'
                  ? 'i-lucide-calendar-clock'
                  : 'i-lucide-list'
            "
          />
          <span>{{ $t(`pages.calendar.${option}`) }}</span>
        </button>
      </div>
    </section>

    <section class="calendar-filters surface-card">
      <FormSelect
        v-model="filters.projectId"
        :placeholder="$t('pages.calendar.allProjects')"
      >
        <option
          v-for="item in projectsStore.projects"
          :key="item.id"
          :value="item.id"
        >
          {{ item.name }}
        </option>
      </FormSelect>
      <FormSelect
        v-model="filters.assigneeId"
        :placeholder="$t('pages.calendar.allAssignees')"
      >
        <option
          v-for="person in assignees"
          :key="person.id"
          :value="person.id"
        >
          {{ person.name }}
        </option>
      </FormSelect>
      <FormSelect
        v-model="filters.priority"
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
        v-model="filters.status"
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
    </section>

    <div class="calendar-summary">
      <AppSurface class="calendar-metric"
        ><UIcon name="i-lucide-calendar-check" />
        <div>
          <span>{{ $t('pages.calendar.planned') }}</span
          ><strong>{{ summary.total }}</strong>
        </div></AppSurface
      >
      <AppSurface class="calendar-metric"
        ><UIcon name="i-lucide-inbox" />
        <div>
          <span>{{ $t('pages.calendar.unscheduled') }}</span
          ><strong>{{ unscheduled.length }}</strong>
        </div></AppSurface
      >
      <AppSurface
        class="calendar-metric"
        :class="{ 'calendar-metric--danger': allConflicts.size }"
        ><UIcon name="i-lucide-triangle-alert" />
        <div>
          <span>{{ $t('pages.calendar.conflicts') }}</span
          ><strong>{{ allConflicts.size }}</strong>
        </div></AppSurface
      >
      <AppSurface class="calendar-metric"
        ><UIcon name="i-lucide-clock-3" />
        <div>
          <span>{{ $t('pages.calendar.selectedLoad') }}</span
          ><strong>{{ Math.round((selectedMinutes / 60) * 10) / 10 }}h</strong>
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
      ><AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton></EmptyState
    >
    <div
      v-else
      class="calendar-workspace__body"
    >
      <aside
        class="calendar-backlog surface-card"
        @dragover.prevent
        @drop="unschedule"
      >
        <header>
          <div>
            <strong>{{ $t('pages.calendar.unscheduled') }}</strong
            ><small>{{ $t('pages.calendar.dragHint') }}</small>
          </div>
          <span>{{ unscheduled.length }}</span>
        </header>
        <div class="calendar-backlog__list">
          <button
            v-for="task in unscheduled"
            :key="task.id"
            draggable="true"
            class="calendar-task"
            @dragstart="drag(task)"
            @click="openTask(task)"
          >
            <i :style="{ background: priorityColors[task.priority] }" /><span
              ><strong>{{ task.title }}</strong
              ><small>{{
                task.dueDate ? $t('pages.calendar.due', { date: task.dueDate }) : $t('pages.calendar.noDate')
              }}</small></span
            >
          </button>
        </div>
      </aside>

      <main class="calendar-workspace__main">
        <section
          v-if="view === 'month'"
          class="calendar-month surface-card"
        >
          <div class="calendar-month__weekdays">
            <div
              v-for="day in weekdays"
              :key="day"
            >
              {{ day }}
            </div>
          </div>
          <div class="calendar-month__grid">
            <div
              v-for="date in monthDates"
              :key="date.toISOString()"
              class="calendar-day"
              :class="{
                'calendar-day--outside': !isSameMonth(date, cursor),
                'calendar-day--selected': format(date, 'yyyy-MM-dd') === selectedDate,
                'calendar-day--today': format(date, 'yyyy-MM-dd') === today
              }"
              role="button"
              tabindex="0"
              @click="selectDate(format(date, 'yyyy-MM-dd'))"
              @dblclick="openNew(format(date, 'yyyy-MM-dd'))"
              @dragover.prevent
              @drop.stop="drop(format(date, 'yyyy-MM-dd'))"
            >
              <span class="calendar-day__number">{{ format(date, 'd') }}</span>
              <div class="calendar-day__tasks">
                <button
                  v-for="task in (tasksByDate[format(date, 'yyyy-MM-dd')] || []).slice(0, 4)"
                  :key="task.id"
                  draggable="true"
                  class="calendar-task-chip"
                  :class="{ 'is-conflict': allConflicts.has(task.id), 'is-done': task.status === 'done' }"
                  @dragstart.stop="drag(task)"
                  @click.stop="openTask(task)"
                >
                  <i :style="{ background: priorityColors[task.priority] }" /><span
                    >{{ task.plannedTime || '' }} {{ task.title }}</span
                  >
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          v-else-if="view === 'week'"
          class="calendar-week surface-card"
        >
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            class="calendar-week__day"
            :class="{ 'is-today': format(day, 'yyyy-MM-dd') === today }"
          >
            <header @click="selectDate(format(day, 'yyyy-MM-dd'))">
              <strong>{{ format(day, 'EEE', { locale: dateLocale }) }}</strong
              ><span>{{ format(day, 'd') }}</span
              ><small
                >{{
                  Math.round((calendarMinutes(tasksByDate[format(day, 'yyyy-MM-dd')] || []) / 60) * 10) / 10
                }}h</small
              >
            </header>
            <button
              v-for="hour in hours"
              :key="hour"
              class="calendar-slot"
              @dblclick="openNew(format(day, 'yyyy-MM-dd'), `${String(hour).padStart(2, '0')}:00`)"
              @dragover.prevent
              @drop="drop(format(day, 'yyyy-MM-dd'), `${String(hour).padStart(2, '0')}:00`)"
            >
              <span>{{ hour }}:00</span>
            </button>
            <button
              v-for="task in (tasksByDate[format(day, 'yyyy-MM-dd')] || []).filter((item) => item.plannedTime)"
              :key="task.id"
              draggable="true"
              class="calendar-week__task"
              :class="{ 'is-conflict': allConflicts.has(task.id) }"
              :style="{
                top: `${3.4 + Math.max(0, Number(task.plannedTime!.slice(0, 2)) - 8) * 2.75}rem`,
                borderColor: priorityColors[task.priority]
              }"
              @dragstart="drag(task)"
              @click="openTask(task)"
            >
              <strong>{{ task.plannedTime }} · {{ task.title }}</strong
              ><small>{{ $t('task.minutes', { count: task.estimateMinutes || 30 }) }}</small>
            </button>
          </div>
        </section>

        <section
          v-else
          class="calendar-agenda surface-card"
        >
          <article
            v-for="date in agendaDays"
            :key="date"
            class="calendar-agenda__day"
          >
            <header @click="selectDate(date)">
              <strong>{{ dateLabel(date, 'd') }}</strong
              ><span>{{ dateLabel(date) }}</span
              ><small>{{ $t('task.minutes', { count: calendarMinutes(tasksByDate[date] || []) }) }}</small>
            </header>
            <button
              v-for="task in (tasksByDate[date] || []).slice().sort(sortByTime)"
              :key="task.id"
              draggable="true"
              class="calendar-agenda__task"
              @dragstart="drag(task)"
              @click="openTask(task)"
            >
              <span class="calendar-agenda__time">{{ task.plannedTime || '—' }}</span
              ><i :style="{ background: priorityColors[task.priority] }" /><span
                ><strong>{{ task.title }}</strong
                ><small
                  >{{ project(task)?.name || $t('task.noProject') }} ·
                  {{ assignee(task)?.name || $t('task.unassigned') }}</small
                ></span
              ><UIcon name="i-lucide-chevron-right" />
            </button>
          </article>
          <EmptyState
            v-if="!agendaDays.length"
            :title="$t('pages.calendar.emptyAgenda')"
            :description="$t('pages.calendar.emptyAgendaHint')"
            icon="i-lucide-calendar-x"
          />
        </section>
      </main>

      <aside class="calendar-day-panel surface-card">
        <header>
          <div>
            <strong>{{ dateLabel(selectedDate, 'd MMMM') }}</strong
            ><small>{{ dateLabel(selectedDate, 'EEEE') }}</small>
          </div>
          <IconButton
            icon="i-lucide-plus"
            :label="$t('shell.newTask')"
            @click="openNew(selectedDate)"
          />
        </header>
        <form
          class="calendar-day-panel__quick"
          @submit.prevent="quickCreate"
        >
          <input
            v-model="quickTitle"
            :placeholder="$t('pages.calendar.quickPlaceholder')"
            :disabled="saving"
          />
          <IconButton
            icon="i-lucide-corner-down-left"
            :label="$t('pages.calendar.quickCreate')"
            type="submit"
            :disabled="!quickTitle.trim() || saving"
          />
        </form>
        <div class="calendar-day-panel__capacity">
          <span
            ><b>{{ Math.round((selectedMinutes / 60) * 10) / 10 }}h</b> / 8h</span
          ><em>{{ selectedPercent }}%</em><i><b :style="{ width: `${selectedPercent}%` }" /></i>
        </div>
        <p
          v-if="selectedConflicts.size"
          class="calendar-day-panel__warning"
        >
          <UIcon name="i-lucide-triangle-alert" />{{
            $t('pages.calendar.conflictWarning', { count: selectedConflicts.size })
          }}
        </p>
        <div class="calendar-day-panel__tasks">
          <article
            v-for="task in selectedTasks"
            :key="task.id"
            class="calendar-day-panel__task"
            :class="{ 'is-conflict': selectedConflicts.has(task.id) }"
          >
            <button @click="openTask(task)">
              <span>{{ task.plannedTime || '—' }}</span
              ><strong>{{ task.title }}</strong>
            </button>
            <IconButton
              :icon="task.dayRank ? 'i-lucide-star' : 'i-lucide-star-off'"
              :label="$t('pages.calendar.toggleTop')"
              size="sm"
              @click="setTop(task)"
            />
          </article>
        </div>
      </aside>
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
    <Modal
      :open="smartOpen"
      :title="$t('pages.calendar.smartPreview')"
      @close="smartOpen = false"
    >
      <p class="text-secondary mb-3 text-sm">{{ $t('pages.calendar.smartPreviewHint') }}</p>
      <div
        v-if="smartPlan.length"
        class="space-y-2"
      >
        <div
          v-for="plan in smartPlan"
          :key="plan.taskId"
          class="flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] p-3 text-sm"
        >
          <UIcon
            name="i-lucide-wand-sparkles"
            class="text-[var(--color-accent)]"
          /><strong class="flex-1">{{ tasks.find((item) => item.id === plan.taskId)?.title }}</strong
          ><span class="text-secondary">{{ plan.plannedDate }} · {{ plan.plannedTime }}</span>
        </div>
      </div>
      <EmptyState
        v-else
        :title="$t('pages.calendar.nothingToPlan')"
        :description="$t('pages.calendar.nothingToPlanHint')"
        icon="i-lucide-circle-check"
      />
      <template #footer
        ><AppButton
          variant="ghost"
          @click="smartOpen = false"
          >{{ $t('common.cancel') }}</AppButton
        ><AppButton
          variant="primary"
          :disabled="!smartPlan.length || saving"
          @click="applySmartPlan"
          >{{ $t('pages.calendar.applyPlan') }}</AppButton
        ></template
      >
    </Modal>
  </div>
</template>

<style scoped>
.calendar-workspace {
  max-width: 1800px;
  margin-inline: auto;
  padding: 1rem;
}
.calendar-toolbar,
.calendar-toolbar__navigation,
.calendar-workspace__views,
.calendar-filters,
.calendar-metric,
.calendar-backlog header,
.calendar-day-panel header {
  display: flex;
  align-items: center;
}
.calendar-toolbar {
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem;
  margin-bottom: 0.65rem;
}
.calendar-toolbar__navigation {
  gap: 0.35rem;
}
.calendar-toolbar__period {
  min-width: 13rem;
  text-align: center;
}
.calendar-toolbar__period strong,
.calendar-toolbar__period span {
  display: block;
}
.calendar-toolbar__period span,
.calendar-backlog small,
.calendar-day-panel small {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.calendar-workspace__views {
  padding: 0.2rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.7rem;
}
.calendar-workspace__views button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
}
.calendar-workspace__views .is-active {
  color: var(--color-bg);
  background: var(--color-text-primary);
}
.calendar-filters {
  gap: 0.45rem;
  padding: 0.55rem;
  margin-bottom: 0.65rem;
}
.calendar-filters .form-select {
  min-width: 9rem;
}
.calendar-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  margin-bottom: 0.65rem;
}
.calendar-metric {
  gap: 0.6rem;
  padding: 0.65rem;
}
.calendar-metric svg {
  color: var(--color-text-secondary);
}
.calendar-metric span,
.calendar-metric strong {
  display: block;
}
.calendar-metric span {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.calendar-metric--danger svg,
.is-conflict {
  color: var(--color-danger) !important;
}
.calendar-workspace__body {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr) 17rem;
  gap: 0.65rem;
  align-items: start;
}
.calendar-backlog,
.calendar-day-panel {
  position: sticky;
  top: 4.5rem;
  max-height: calc(100vh - 5.5rem);
  padding: 0.7rem;
  overflow: auto;
}
.calendar-backlog header,
.calendar-day-panel header {
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.6rem;
}
.calendar-backlog header div,
.calendar-day-panel header div {
  min-width: 0;
}
.calendar-backlog header strong,
.calendar-backlog header small,
.calendar-day-panel header strong,
.calendar-day-panel header small {
  display: block;
}
.calendar-backlog header > span {
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--color-bg-alt);
  font-size: 0.7rem;
}
.calendar-backlog__list,
.calendar-day-panel__tasks {
  display: grid;
  gap: 0.35rem;
}
.calendar-task {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  width: 100%;
  padding: 0.55rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
  text-align: left;
}
.calendar-task:hover,
.calendar-agenda__task:hover {
  background: var(--color-bg-alt);
}
.calendar-task i,
.calendar-task-chip i,
.calendar-agenda__task i {
  width: 0.4rem;
  height: 0.4rem;
  margin-top: 0.3rem;
  flex: none;
  border-radius: 50%;
}
.calendar-task span,
.calendar-task strong,
.calendar-task small {
  display: block;
  min-width: 0;
}
.calendar-task strong {
  font-size: 0.72rem;
}
.calendar-task small {
  margin-top: 0.1rem;
  color: var(--color-text-secondary);
  font-size: 0.6rem;
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
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  text-align: center;
}
.calendar-month__weekdays div {
  padding: 0.55rem;
}
.calendar-day {
  min-height: 7.5rem;
  padding: 0.45rem;
  border-top: 1px solid var(--color-panel-border);
  border-right: 1px solid var(--color-panel-border);
  outline: none;
}
.calendar-day:hover,
.calendar-day--selected {
  background: var(--color-bg-alt);
}
.calendar-day--selected {
  box-shadow: inset 0 0 0 1px var(--color-accent);
}
.calendar-day--outside {
  opacity: 0.38;
}
.calendar-day__number {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
}
.calendar-day--today .calendar-day__number {
  color: white;
  background: var(--color-accent);
}
.calendar-day__tasks {
  display: grid;
  gap: 0.16rem;
  margin-top: 0.25rem;
}
.calendar-task-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  min-width: 0;
  padding: 0.22rem 0.3rem;
  border-radius: 0.35rem;
  background: var(--color-panel-bg);
  font-size: 0.62rem;
  text-align: left;
}
.calendar-task-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-task-chip.is-done {
  opacity: 0.5;
  text-decoration: line-through;
}
.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(8rem, 1fr));
  min-height: 34rem;
  padding: 0;
  overflow-x: auto;
}
.calendar-week__day {
  position: relative;
  min-width: 8rem;
  border-right: 1px solid var(--color-panel-border);
}
.calendar-week__day > header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  height: 3.2rem;
  padding: 0.5rem;
  background: var(--color-panel-bg);
  border-bottom: 1px solid var(--color-panel-border);
  text-transform: capitalize;
}
.calendar-week__day > header span {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
  background: var(--color-bg-alt);
}
.calendar-week__day > header small {
  margin-left: auto;
  color: var(--color-text-secondary);
}
.calendar-week__day.is-today > header span {
  color: white;
  background: var(--color-accent);
}
.calendar-slot {
  display: flex;
  width: 100%;
  height: 2.75rem;
  padding: 0.25rem;
  border-bottom: 1px dashed var(--color-panel-border);
  color: var(--color-text-secondary);
  font-size: 0.55rem;
}
.calendar-week__task {
  position: absolute;
  z-index: 1;
  right: 0.25rem;
  left: 0.25rem;
  min-height: 2.35rem;
  padding: 0.35rem;
  border: 1px solid;
  border-radius: 0.5rem;
  background: var(--color-panel-bg);
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.08);
  text-align: left;
}
.calendar-week__task strong,
.calendar-week__task small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
}
.calendar-week__task small {
  color: var(--color-text-secondary);
  font-size: 0.55rem;
}
.calendar-agenda {
  padding: 0.75rem;
}
.calendar-agenda__day {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 0.6rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--color-panel-border);
}
.calendar-agenda__day > header strong,
.calendar-agenda__day > header span,
.calendar-agenda__day > header small {
  display: block;
  text-transform: capitalize;
}
.calendar-agenda__day > header small {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}
.calendar-agenda__task {
  display: grid;
  grid-template-columns: 2.8rem 0.4rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.55rem;
  border-radius: 0.65rem;
  text-align: left;
}
.calendar-agenda__task strong,
.calendar-agenda__task small {
  display: block;
}
.calendar-agenda__task small {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.calendar-agenda__time {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.calendar-day-panel__capacity {
  padding: 0.6rem 0;
  font-size: 0.7rem;
}
.calendar-day-panel__quick {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.25rem;
}
.calendar-day-panel__quick input {
  width: 100%;
  min-width: 0;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.6rem;
  background: var(--color-bg-alt);
  font-size: 0.7rem;
  outline: none;
}
.calendar-day-panel__quick input:focus {
  border-color: var(--color-accent);
}
.calendar-day-panel__capacity span {
  display: flex;
  justify-content: space-between;
}
.calendar-day-panel__capacity em {
  float: right;
  margin-top: -1rem;
  font-style: normal;
}
.calendar-day-panel__capacity > i {
  display: block;
  height: 0.3rem;
  margin-top: 0.4rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-bg-alt);
}
.calendar-day-panel__capacity > i b {
  display: block;
  height: 100%;
  background: var(--color-accent);
}
.calendar-day-panel__warning {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  padding: 0.45rem;
  border-radius: 0.55rem;
  background: rgb(239 68 68 / 0.1);
  color: var(--color-danger);
  font-size: 0.65rem;
}
.calendar-day-panel__task {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.6rem;
}
.calendar-day-panel__task > button {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0.3rem;
  flex: 1;
  min-width: 0;
  padding: 0.5rem;
  text-align: left;
}
.calendar-day-panel__task span {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.calendar-day-panel__task strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.7rem;
}
.calendar-undo {
  position: fixed;
  z-index: 70;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-radius: 0.8rem;
  background: var(--color-text-primary);
  color: var(--color-bg);
  box-shadow: 0 15px 40px rgb(0 0 0 / 0.25);
  font-size: 0.75rem;
}
.calendar-undo button {
  color: var(--color-accent);
  font-weight: 700;
}
@media (max-width: 1200px) {
  .calendar-workspace__body {
    grid-template-columns: 12rem minmax(0, 1fr);
  }
  .calendar-day-panel {
    position: static;
    grid-column: 1/-1;
    max-height: none;
  }
  .calendar-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 800px) {
  .calendar-workspace__body {
    grid-template-columns: 1fr;
  }
  .calendar-backlog {
    position: static;
    max-height: 14rem;
  }
  .calendar-toolbar,
  .calendar-filters {
    align-items: stretch;
    flex-direction: column;
  }
  .calendar-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .calendar-toolbar__navigation {
    justify-content: space-between;
  }
  .calendar-workspace__main {
    min-width: 0;
  }
  .calendar-month {
    overflow-x: auto;
  }
  .calendar-month__weekdays,
  .calendar-month__grid {
    min-width: 42rem;
  }
}
@media (max-width: 639px) {
  .calendar-workspace {
    padding: 0.65rem;
  }
  .calendar-workspace__views {
    width: 100%;
  }
  .calendar-workspace__views button {
    flex: 1;
    justify-content: center;
  }
  .calendar-workspace__views button span {
    display: none;
  }
  .calendar-filters {
    grid-template-columns: 1fr;
  }
  .calendar-summary {
    gap: 0.35rem;
  }
  .calendar-metric {
    padding: 0.5rem;
  }
  .calendar-agenda__day {
    grid-template-columns: 1fr;
  }
  .calendar-backlog {
    display: none;
  }
}
</style>
