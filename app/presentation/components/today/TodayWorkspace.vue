<script setup lang="ts">
import { addDays, format } from 'date-fns'
import { bulkUpdateTasks, createTask, fetchTodayPlan, updateTask } from '~/data/repositories/tasksRepository'
import { fetchProjects } from '~/data/repositories/projectsRepository'
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, CreateTaskInput, Task, UpdateTaskInput } from '~/domain/entities/task'
import {
  filterTodayTasks,
  localDateKey,
  localDayRange,
  todayProgress,
  todaySections,
  type TodayFilters
} from '~/domain/services/today'
import { getCurrentWeek } from '~/domain/services/week'
import { autoPlanDay } from '~/domain/services/daySchedule'
import { defaultDaySchedule, type DaySchedule } from '#shared/types/daySchedule'

const { t, locale } = useI18n()
const { user } = useUserSession()
const route = useRoute()
const date = ref(localDateKey())
const tasks = ref<Task[]>([])
const projects = ref<Project[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const selected = ref<string[]>([])
const doneOpen = ref(false)
const quickOpen = ref(true)
const view = useLocalStorage<'list' | 'timeline'>('weekflow-today-view-v3', 'list')
const filtersOpen = ref(false)
const schedule = ref<DaySchedule>({ ...defaultDaySchedule })
const filters = useLocalStorage<TodayFilters>('weekflow-today-filters-v1', {
  search: '',
  projectId: null,
  priority: null,
  status: null,
  assigneeId: null,
  topOnly: false
})
const undoAction = ref<null | { label: string; restore: Task[] }>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined
const focusTimer = useFocusTimer()
const tasksStore = useTasksStore()
const offlineQueue = useOfflineMutationQueue()

const visible = computed(() => filterTodayTasks(tasks.value, filters.value))
const sections = computed(() => todaySections(visible.value, date.value))
const progress = computed(() => todayProgress(tasks.value, date.value))
const planTasks = computed(() => {
  const todayOverdue = sections.value.overdue.filter((task) => task.plannedDate === date.value)
  const ordered = [...todayOverdue, ...sections.value.top, ...sections.value.inProgress, ...sections.value.planned]
  return ordered.filter((task, index) => ordered.findIndex((item) => item.id === task.id) === index)
})
const currentTask = computed(() => {
  const focusedId = focusTimer.state.value.taskId
  return (
    planTasks.value.find((task) => task.id === focusedId) ||
    planTasks.value.find((task) => task.status === 'in_progress') ||
    planTasks.value.find((task) => task.dayRank === 1) ||
    planTasks.value[0] ||
    null
  )
})
const hasFilters = computed(() =>
  Boolean(
    filters.value.search ||
    filters.value.projectId ||
    filters.value.priority ||
    filters.value.assigneeId ||
    filters.value.topOnly
  )
)
const formattedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${date.value}T12:00:00`)
  )
)
const estimate = computed(() =>
  tasks.value
    .filter((task) => task.plannedDate === date.value && task.status !== 'done')
    .reduce((sum, task) => sum + (task.estimateMinutes || 0), 0)
)
const selectedTasks = computed(() => tasks.value.filter((task) => selected.value.includes(task.id)))
const projectName = (id: string | null) => projects.value.find((project) => project.id === id)?.name
const assigneeName = (id: string | null) => assignees.value.find((person) => person.id === id)?.name

function resetFilters() {
  Object.assign(filters.value, {
    search: '',
    projectId: null,
    priority: null,
    status: null,
    assigneeId: null,
    topOnly: false
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const target = new Date(`${date.value}T12:00:00`)
    const range = localDayRange(target)
    const [plan, projectItems, people, preferences] = await Promise.all([
      fetchTodayPlan(date.value, range.start, range.end),
      fetchProjects(),
      $fetch<AssignableUser[]>('/api/users/assignable'),
      $fetch<{ daySchedule: DaySchedule }>('/api/settings')
    ])
    tasks.value = plan.tasks
    projects.value = projectItems
    assignees.value = people
    schedule.value = preferences.daySchedule
    const requestedTask = typeof route.query.task === 'string' ? route.query.task : null
    const linkedTask = requestedTask ? tasks.value.find((task) => task.id === requestedTask) : null
    if (linkedTask) {
      editingTask.value = linkedTask
      editorOpen.value = true
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('pages.today.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(date, () => {
  selected.value = []
  void load()
})
useLiveRefresh('tasks', load)

function sync(task: Task) {
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index === -1) tasks.value.push(task)
  else tasks.value[index] = task
  tasksStore.syncListTask(task)
}
async function patchTask(task: Task, patch: UpdateTaskInput) {
  const before = { ...task }
  sync({ ...task, ...patch })
  try {
    sync(
      await offlineQueue.capture(
        { url: `/api/tasks/${task.id}`, method: 'PATCH', body: patch },
        () => updateTask(task.id, patch),
        { ...task, ...patch }
      )
    )
    broadcastSync('tasks')
  } catch (cause) {
    sync(before)
    throw cause
  }
}
async function createQuick(payload: Omit<CreateTaskInput, 'week'>) {
  if (saving.value) return
  saving.value = true
  try {
    const task = await createTask({ ...payload, plannedDate: date.value, week: getCurrentWeek() })
    sync(task)
    broadcastSync('tasks')
  } finally {
    saving.value = false
  }
}
function edit(task: Task) {
  editingTask.value = task
  editorOpen.value = true
  void navigateTo({ query: { ...route.query, task: task.id } })
}
function createFull() {
  editingTask.value = null
  editorOpen.value = true
}
function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
  const query = { ...route.query }
  delete query.task
  void navigateTo({ query, replace: true })
}
async function saveNew(payload: Omit<CreateTaskInput, 'week'>) {
  sync(await createTask({ ...payload, plannedDate: payload.plannedDate || date.value, week: getCurrentWeek() }))
  closeEditor()
  broadcastSync('tasks')
}
function selectTask(id: string, checked: boolean) {
  selected.value = checked ? [...new Set([...selected.value, id])] : selected.value.filter((item) => item !== id)
}

function offerUndo(label: string, restore: Task[]) {
  undoAction.value = { label, restore }
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => {
    undoAction.value = null
  }, 8000)
}
async function bulk(patch: UpdateTaskInput, label: string) {
  if (!selected.value.length || saving.value) return
  const restore = selectedTasks.value.map((task) => ({ ...task }))
  tasks.value = tasks.value.map((task) => (selected.value.includes(task.id) ? { ...task, ...patch } : task))
  saving.value = true
  try {
    ;(await bulkUpdateTasks(selected.value, patch)).forEach(sync)
    offerUndo(label, restore)
    selected.value = []
    broadcastSync('tasks')
  } catch (cause) {
    restore.forEach(sync)
    throw cause
  } finally {
    saving.value = false
  }
}
async function undo() {
  const action = undoAction.value
  undoAction.value = null
  if (!action) return
  await Promise.all(action.restore.map((task) => updateTask(task.id, task)))
  action.restore.forEach(sync)
  broadcastSync('tasks')
}
async function rank(task: Task, requested: number | null) {
  if (!requested) return patchTask(task, { dayRank: null })
  const used = new Set(tasks.value.filter((item) => item.id !== task.id && item.dayRank).map((item) => item.dayRank!))
  const rankValue = [1, 2, 3].find((value) => !used.has(value)) || task.dayRank || 3
  await patchTask(task, { dayRank: rankValue, plannedDate: date.value })
}
async function startFocus(task: Task) {
  const duration = (task.estimateMinutes || 25) * 60
  const focus = await $fetch<{ id: string; kind: 'focus' }>('/api/focus', {
    method: 'POST',
    body: { taskId: task.id, kind: 'focus', plannedSeconds: duration }
  })
  focusTimer.start({ sessionId: focus.id, taskId: task.id, taskTitle: task.title, kind: focus.kind, duration })
}
async function saveSchedule(value: DaySchedule) {
  schedule.value = { ...value }
  await $fetch('/api/settings', { method: 'PATCH', body: { daySchedule: value } })
}
async function moveToTimeZone(task: Task, plannedTime: string | null) {
  await patchTask(task, { plannedDate: date.value, plannedTime })
}
async function autoPlan() {
  if (saving.value) return
  const plan = autoPlanDay(tasks.value, date.value, schedule.value).filter((item) => item.plannedTime)
  if (!plan.length) return
  saving.value = true
  try {
    const updated = await Promise.all(plan.map((item) => updateTask(item.id, { plannedTime: item.plannedTime })))
    updated.forEach(sync)
    broadcastSync('tasks')
  } finally {
    saving.value = false
  }
}
function relativeDate(offset: number) {
  return format(addDays(new Date(`${date.value}T12:00:00`), offset), 'yyyy-MM-dd')
}
</script>

<template>
  <main class="today-workspace app-container">
    <header class="today-workspace__hero">
      <div>
        <h1>{{ $t('nav.today') }}</h1>
        <p class="text-secondary today-workspace__date">{{ formattedDate }}</p>
      </div>
      <div class="today-workspace__date-nav">
        <IconButton
          icon="i-lucide-chevron-left"
          :label="$t('pages.today.previousDay')"
          @click="date = relativeDate(-1)"
        />
        <AppButton
          variant="secondary"
          @click="date = localDateKey()"
          >{{ $t('pages.today.goToday') }}</AppButton
        >
        <IconButton
          icon="i-lucide-chevron-right"
          :label="$t('pages.today.nextDay')"
          @click="date = relativeDate(1)"
        />
      </div>
    </header>

    <section
      class="today-workspace__summary"
      :aria-label="$t('pages.today.summary')"
    >
      <div class="today-workspace__progress">
        <span>{{ $t('taskActions.progress', { done: progress.done, total: progress.total }) }}</span>
        <strong>{{ progress.percent }}%</strong>
        <i><b :style="{ width: `${progress.percent}%` }" /></i>
      </div>
      <span
        ><UIcon name="i-lucide-list-todo" />{{ $t('pages.today.tasksRemaining', { count: planTasks.length }) }}</span
      >
      <span><UIcon name="i-lucide-hourglass" />{{ estimate }} {{ $t('pages.today.minutesPlanned') }}</span>
      <NuxtLink
        v-if="sections.overdue.length"
        :to="{ path: '/today', query: { mode: 'overdue' } }"
        class="today-workspace__overdue"
        ><UIcon name="i-lucide-triangle-alert" />{{
          $t('pages.today.overdueSummary', { count: sections.overdue.length })
        }}</NuxtLink
      >
    </section>

    <TodayNowCard
      :task="currentTask"
      :project-name="currentTask ? projectName(currentTask.projectId) : undefined"
      :focus-active="focusTimer.active.value"
      :focus-running="focusTimer.state.value.running"
      :focus-display="focusTimer.display.value"
      @focus="currentTask && startFocus(currentTask)"
      @toggle="currentTask && patchTask(currentTask, { status: 'done' })"
      @edit="currentTask && edit(currentTask)"
      @pause="focusTimer.pause()"
      @resume="focusTimer.resume()"
    />

    <div class="today-workspace__actions">
      <div
        class="today-workspace__view-switch"
        role="group"
        :aria-label="$t('pages.today.viewSwitch')"
      >
        <button
          type="button"
          :class="{ 'today-workspace__view-button--active': view === 'list' }"
          @click="view = 'list'"
        >
          <UIcon name="i-lucide-list" />{{ $t('pages.today.listView') }}
        </button>
        <button
          type="button"
          :class="{ 'today-workspace__view-button--active': view === 'timeline' }"
          @click="view = 'timeline'"
        >
          <UIcon name="i-lucide-calendar-clock" />{{ $t('pages.today.scheduleView') }}
        </button>
      </div>
      <AppButton
        v-if="view === 'list'"
        variant="ghost"
        size="sm"
        icon="i-lucide-list-filter"
        @click="filtersOpen = !filtersOpen"
        >{{ $t('pages.today.filters')
        }}<span
          v-if="hasFilters"
          class="today-workspace__filter-dot"
      /></AppButton>
    </div>

    <div
      v-if="view === 'list' && filtersOpen"
      class="today-workspace__toolbar surface-card"
    >
      <FormInput
        v-model="filters.search"
        class="today-workspace__search"
        type="search"
        :placeholder="$t('pages.today.search')"
      />
      <FormSelect
        v-model="filters.projectId"
        :aria-label="$t('task.project')"
        ><option :value="null">{{ $t('task.noProject') }}</option>
        <option
          v-for="project in projects"
          :key="project.id"
          :value="project.id"
        >
          {{ project.name }}
        </option></FormSelect
      >
      <FormSelect
        v-model="filters.priority"
        :aria-label="$t('task.priority')"
        ><option :value="null">{{ $t('pages.today.allPriorities') }}</option>
        <option
          v-for="priority in ['urgent', 'high', 'medium', 'low']"
          :key="priority"
          :value="priority"
        >
          {{ $t(`task.priorityValue.${priority}`) }}
        </option></FormSelect
      >
      <button
        class="today-workspace__filter"
        :class="{ 'today-workspace__filter--active': filters.assigneeId }"
        @click="filters.assigneeId = filters.assigneeId ? null : user?.id || null"
      >
        <UIcon name="i-lucide-user-round-check" />{{ $t('pages.today.mine') }}
      </button>
      <button
        class="today-workspace__filter"
        :class="{ 'today-workspace__filter--active': filters.topOnly }"
        @click="filters.topOnly = !filters.topOnly"
      >
        <UIcon name="i-lucide-star" />Top 3
      </button>
      <AppButton
        v-if="hasFilters"
        variant="ghost"
        size="sm"
        @click="resetFilters"
        >{{ $t('pages.today.clearFilters') }}</AppButton
      >
    </div>

    <TaskQuickCreate
      v-if="quickOpen"
      status="todo"
      :projects="projects"
      :assignees="assignees"
      @create="createQuick"
      @full="createFull"
      @close="quickOpen = false"
    />
    <AppButton
      v-else
      class="today-workspace__new"
      icon="i-lucide-plus"
      @click="quickOpen = true"
      >{{ $t('shell.newTask') }}</AppButton
    >

    <div
      v-if="selected.length"
      class="today-workspace__bulk"
    >
      <strong>{{ $t('pages.today.selected', { count: selected.length }) }}</strong
      ><AppButton
        size="sm"
        @click="bulk({ status: 'done' }, $t('pages.today.bulkCompleted'))"
        >{{ $t('common.done') }}</AppButton
      ><AppButton
        size="sm"
        variant="secondary"
        @click="bulk({ plannedDate: relativeDate(1) }, $t('pages.today.bulkRescheduled'))"
        >{{ $t('pages.today.tomorrow') }}</AppButton
      ><AppButton
        size="sm"
        variant="secondary"
        @click="bulk({ archivedAt: Date.now() }, $t('pages.today.bulkArchived'))"
        >{{ $t('nav.archive') }}</AppButton
      ><IconButton
        icon="i-lucide-x"
        :label="$t('common.close')"
        @click="selected = []"
      />
    </div>

    <div
      v-if="loading"
      class="today-workspace__loading"
    >
      <USkeleton
        v-for="i in 5"
        :key="i"
        class="h-16 rounded-xl"
      />
    </div>
    <EmptyState
      v-else-if="error"
      icon="i-lucide-cloud-alert"
      :title="$t('pages.today.loadError')"
      :description="error"
      ><AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton></EmptyState
    >
    <div
      v-else
      class="today-workspace__sections"
      :class="`today-workspace__sections--${view}`"
    >
      <TodayTimePlanner
        v-if="view === 'timeline'"
        :tasks="visible"
        :date="date"
        :schedule="schedule"
        :projects="projects"
        :assignees="assignees"
        :saving="saving"
        @move="moveToTimeZone"
        @patch="patchTask"
        @edit="edit"
        @focus="startFocus"
        @auto-plan="autoPlan"
        @save-schedule="saveSchedule"
      />
      <template v-else>
        <section
          v-if="planTasks.length"
          class="today-workspace__section"
        >
          <h2>
            <UIcon name="i-lucide-list-todo" />{{ $t('pages.today.planTitle') }}<span>{{ planTasks.length }}</span>
          </h2>
          <BoundedTaskList
            :count="planTasks.length"
            :preview="8"
            :row-height="70"
            storage-key="today-daily-plan"
          >
            <div class="today-workspace__task-list">
              <TodayTaskRow
                v-for="task in planTasks"
                :key="task.id"
                :task="task"
                :selected="selected.includes(task.id)"
                :project-name="projectName(task.projectId)"
                :assignee-name="assigneeName(task.assigneeId)"
                @select="selectTask(task.id, $event)"
                @toggle="patchTask(task, { status: task.status === 'done' ? 'todo' : 'done' })"
                @edit="edit(task)"
                @patch="$event.dayRank !== undefined ? rank(task, $event.dayRank) : patchTask(task, $event)"
                @focus="startFocus(task)"
              />
            </div>
          </BoundedTaskList>
        </section>
        <section
          v-if="sections.done.length"
          class="today-workspace__section"
        >
          <button
            class="today-workspace__done-toggle"
            @click="doneOpen = !doneOpen"
          >
            <UIcon name="i-lucide-circle-check-big" />{{ $t('pages.today.sections.done') }}
            <span>{{ sections.done.length }}</span
            ><UIcon :name="doneOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" /></button
          ><BoundedTaskList
            v-if="doneOpen"
            :count="sections.done.length"
            :preview="6"
            :row-height="70"
            storage-key="today-list-done"
          >
            <div class="today-workspace__task-list">
              <TodayTaskRow
                v-for="task in sections.done"
                :key="task.id"
                :task="task"
                :selected="selected.includes(task.id)"
                @select="selectTask(task.id, $event)"
                @toggle="patchTask(task, { status: 'todo' })"
                @edit="edit(task)"
                @patch="patchTask(task, $event)"
                @focus="startFocus(task)"
              />
            </div>
          </BoundedTaskList>
        </section>
        <EmptyState
          v-if="!planTasks.length && !sections.done.length"
          icon="i-lucide-sun"
          :title="$t('pages.today.empty')"
          :description="$t('pages.today.emptyHint')"
        />
      </template>
    </div>

    <div
      v-if="undoAction"
      class="today-workspace__undo"
    >
      <span>{{ undoAction.label }}</span
      ><button @click="undo">{{ $t('common.cancel') }}</button>
    </div>
    <TaskEditor
      :open="editorOpen"
      :task="editingTask"
      :projects="projects"
      :assignees="assignees"
      @close="closeEditor"
      @save="saveNew"
      @updated="sync"
      @promoted="sync"
    />
  </main>
</template>

<style scoped src="~/presentation/assets/css/components/today/today-workspace.css"></style>
