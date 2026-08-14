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

const { t } = useI18n()
const { user } = useUserSession()
const route = useRoute()
const date = ref(localDateKey())
const tasks = ref<Task[]>([])
const projects = ref<Project[]>([])
const assignees = ref<AssignableUser[]>([])
const focusMinutes = ref(0)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const selected = ref<string[]>([])
const doneOpen = ref(false)
const quickOpen = ref(true)
const view = useLocalStorage<'list' | 'timeline'>('weekflow-today-view-v2', 'timeline')
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
const estimate = computed(() =>
  tasks.value
    .filter((task) => task.plannedDate === date.value && task.status !== 'done')
    .reduce((sum, task) => sum + (task.estimateMinutes || 0), 0)
)
const selectedTasks = computed(() => tasks.value.filter((task) => selected.value.includes(task.id)))
const projectName = (id: string | null) => projects.value.find((project) => project.id === id)?.name
const assigneeName = (id: string | null) => assignees.value.find((person) => person.id === id)?.name

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
    focusMinutes.value = plan.focusMinutes
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
        <p class="today-workspace__eyebrow">{{ $t('pages.today.workspace') }}</p>
        <h1>{{ $t('nav.today') }}</h1>
        <p class="text-secondary">{{ date }}</p>
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
        <strong>{{ progress.percent }}%</strong
        ><span>{{ $t('taskActions.progress', { done: progress.done, total: progress.total }) }}</span
        ><i><b :style="{ width: `${progress.percent}%` }" /></i>
      </div>
      <div>
        <UIcon name="i-lucide-triangle-alert" /><strong>{{ sections.overdue.length }}</strong
        ><span>{{ $t('nav.overdue') }}</span>
      </div>
      <div>
        <UIcon name="i-lucide-hourglass" /><strong>{{ estimate }}</strong
        ><span>{{ $t('pages.today.minutesPlanned') }}</span>
      </div>
      <div>
        <UIcon name="i-lucide-timer" /><strong>{{ focusMinutes }}</strong
        ><span>{{ $t('pages.today.minutesFocused') }}</span>
      </div>
    </section>

    <TodayCommandCenter />

    <aside
      v-if="focusTimer.active.value"
      class="today-workspace__focus-banner"
    >
      <UIcon name="i-lucide-timer" /><span>{{ focusTimer.state.value.taskTitle }}</span
      ><strong>{{ focusTimer.display.value }}</strong
      ><AppButton
        size="sm"
        variant="secondary"
        @click="focusTimer.state.value.running ? focusTimer.pause() : focusTimer.resume()"
        >{{ focusTimer.state.value.running ? $t('pages.focus.pause') : $t('pages.focus.resume') }}</AppButton
      >
    </aside>

    <div class="today-workspace__toolbar">
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
      <IconButton
        :icon="view === 'list' ? 'i-lucide-list' : 'i-lucide-calendar-clock'"
        :label="$t('pages.today.toggleView')"
        @click="view = view === 'list' ? 'timeline' : 'list'"
      />
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
          v-for="section in [
            ['overdue', sections.overdue, 'i-lucide-triangle-alert'],
            ['top', sections.top, 'i-lucide-star'],
            ['inProgress', sections.inProgress, 'i-lucide-loader-circle'],
            ['planned', sections.planned, 'i-lucide-calendar-check']
          ] as const"
          :key="section[0]"
          v-show="section[1].length"
          class="today-workspace__section"
        >
          <h2>
            <UIcon :name="section[2]" />{{ $t(`pages.today.sections.${section[0]}`)
            }}<span>{{ section[1].length }}</span>
          </h2>
          <BoundedTaskList
            :count="section[1].length"
            :preview="6"
            :row-height="70"
            :storage-key="`today-list-${section[0]}`"
          >
            <div class="today-workspace__task-list">
              <TodayTaskRow
                v-for="task in section[1]"
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
          v-if="!visible.length"
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

<style scoped>
.today-workspace {
  max-width: 90rem;
  padding-bottom: 5rem;
}
.today-workspace__hero,
.today-workspace__date-nav,
.today-workspace__toolbar,
.today-workspace__bulk,
.today-workspace__focus-banner {
  display: flex;
  align-items: center;
}
.today-workspace__hero {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.today-workspace__hero h1 {
  font-size: clamp(1.65rem, 3vw, 2.35rem);
  font-weight: 800;
}
.today-workspace__eyebrow {
  color: var(--color-accent);
  font-size: 0.72rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.today-workspace__date-nav {
  gap: 0.4rem;
}
.today-workspace__summary {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}
.today-workspace__summary > div {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.1rem 0.55rem;
  padding: 0.8rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.85rem;
  background: var(--color-panel-bg);
}
.today-workspace__summary svg {
  grid-row: 1/3;
  color: var(--color-accent);
  font-size: 1.15rem;
}
.today-workspace__summary strong {
  font-size: 1.05rem;
}
.today-workspace__summary span {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.today-workspace__progress i {
  grid-column: 1/-1;
  height: 3px;
  border-radius: 99px;
  background: var(--color-bg-alt);
  overflow: hidden;
}
.today-workspace__progress b {
  display: block;
  height: 100%;
  background: var(--color-accent);
}
.today-workspace__focus-banner {
  gap: 0.65rem;
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-panel-border));
  border-radius: 0.8rem;
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-panel-bg));
}
.today-workspace__focus-banner span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.today-workspace__toolbar {
  gap: 0.45rem;
  margin-bottom: 0.75rem;
}
.today-workspace__search {
  min-width: 12rem;
  flex: 1;
}
.today-workspace__toolbar :deep(select) {
  min-width: 9rem;
}
.today-workspace__filter {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.6rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
.today-workspace__filter--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.today-workspace__new {
  margin-bottom: 0.75rem;
}
.today-workspace__bulk {
  position: sticky;
  top: 0.5rem;
  z-index: 10;
  gap: 0.5rem;
  margin: 0.65rem 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-accent);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
  box-shadow: 0 12px 30px rgb(0 0 0/0.18);
}
.today-workspace__bulk strong {
  margin-right: auto;
  font-size: 0.8rem;
}
.today-workspace__loading,
.today-workspace__sections,
.today-workspace__section {
  display: grid;
  gap: 0.5rem;
}
.today-workspace__sections {
  margin-top: 0.9rem;
}
.today-workspace__section {
  padding: 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-panel-bg) 65%, transparent);
}
.today-workspace__section h2,
.today-workspace__done-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 750;
}
.today-workspace__section h2 span,
.today-workspace__done-toggle span {
  padding: 0.08rem 0.42rem;
  border-radius: 99px;
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.today-workspace__done-toggle {
  width: 100%;
  text-align: left;
}
.today-workspace__done-toggle svg:last-child {
  margin-left: auto;
}
.today-workspace__sections--timeline .today-workspace__section {
  border-left: 3px solid var(--color-accent);
}
.today-workspace__undo {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: flex;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 0.75rem;
  background: #09090b;
  color: white;
  box-shadow: 0 15px 40px rgb(0 0 0/0.35);
  font-size: 0.8rem;
}
.today-workspace__undo button {
  color: var(--color-accent);
  font-weight: 750;
}
@media (max-width: 850px) {
  .today-workspace__summary {
    grid-template-columns: 1fr 1fr;
  }
  .today-workspace__toolbar {
    flex-wrap: wrap;
  }
  .today-workspace__search {
    flex-basis: 100%;
  }
}
@media (max-width: 600px) {
  .today-workspace__hero {
    align-items: flex-start;
  }
  .today-workspace__date-nav :deep(.base-button) {
    display: none;
  }
  .today-workspace__summary {
    grid-template-columns: 1fr 1fr;
  }
  .today-workspace__summary > div {
    padding: 0.65rem;
  }
  .today-workspace__toolbar :deep(select) {
    min-width: 0;
    flex: 1;
  }
  .today-workspace__bulk {
    overflow-x: auto;
  }
  .today-workspace__bulk strong {
    display: none;
  }
  .today-workspace__section {
    padding: 0.5rem;
    border-radius: 0.8rem;
  }
}
</style>
