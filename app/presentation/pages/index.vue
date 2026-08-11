<script setup lang="ts">
import type { AssignableUser, Task, TaskPriority, TaskRecurrence, UpdateTaskInput } from '~/domain/entities/task'
import { parseQuickTask } from '~/domain/services/quickTaskParser'

const { week, label, isCurrentWeek, next, prev, goToCurrent } = useWeek()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const route = useRoute()
const { user, clear } = useUserSession()
const { t } = useI18n()

if (typeof route.query.week === 'string') {
  week.value = route.query.week
}
if (typeof route.query.project === 'string') {
  tasksStore.filterProjectId = route.query.project
}

const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const editorDefaultStatus = ref<Task['status']>('todo')

const projectEditorOpen = ref(false)
const search = ref('')
const priorityFilter = ref<TaskPriority | null>(
  typeof route.query.priority === 'string' && ['low', 'medium', 'high', 'urgent'].includes(route.query.priority)
    ? (route.query.priority as TaskPriority)
    : null
)
const assigneeFilter = ref<string | null>(typeof route.query.assignee === 'string' ? route.query.assignee : null)
const statusFilter = ref<Task['status'] | null>(
  typeof route.query.status === 'string' && ['todo', 'in_progress', 'done'].includes(route.query.status)
    ? (route.query.status as Task['status'])
    : null
)
const viewMode = useLocalStorage<'board' | 'table'>('weekflow-task-view', 'board')
type BoardMode = 'status' | 'day' | 'assignee' | 'project' | 'priority'
const boardMode = useLocalStorage<BoardMode>('weekflow-board-mode-v3', 'status')
const boardDensity = useLocalStorage<'comfortable' | 'compact' | 'titles'>('weekflow-board-density-v3', 'comfortable')
const selectedIds = ref<string[]>([])
const assignees = ref<AssignableUser[]>([])
const undoAction = ref<null | { label: string; run: () => Promise<void> }>(null)
const workspaceReady = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const commandOpen = ref(false)
const taskCreatedBus = useEventBus<Task>('weekflow:task-created')
let undoTimer: ReturnType<typeof setTimeout> | undefined

taskCreatedBus.on((task) => {
  if (task.week === week.value && !tasksStore.tasks.some((item) => item.id === task.id)) {
    tasksStore.tasks.push(task)
  }
})

const reusableTags = computed(() =>
  [...new Set(tasksStore.tasks.flatMap((task) => task.tags ?? []))].sort((a, b) => a.localeCompare(b, 'uk'))
)

const boardTasks = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = tasksStore.tasksByStatus
  return Object.fromEntries(
    Object.entries(source).map(([status, tasks]) => [
      status,
      tasks.filter(
        (task) =>
          (!term || `${task.title} ${task.note ?? ''} ${(task.tags ?? []).join(' ')}`.toLowerCase().includes(term)) &&
          (!priorityFilter.value || task.priority === priorityFilter.value) &&
          (!assigneeFilter.value || task.assigneeId === assigneeFilter.value) &&
          (!statusFilter.value || task.status === statusFilter.value) &&
          !task.archivedAt
      )
    ])
  ) as Record<Task['status'], Task[]>
})
const boardTaskList = computed(() => Object.values(boardTasks.value).flat())
const todayKey = computed(() => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
})
const boardInsights = computed(() => ({
  estimate: boardTaskList.value
    .filter((task) => task.status !== 'done')
    .reduce((sum, task) => sum + (task.estimateMinutes || 0), 0),
  overdue: boardTaskList.value.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < todayKey.value)
    .length,
  unassigned: boardTaskList.value.filter((task) => task.status !== 'done' && !task.assigneeId).length,
  unplanned: boardTaskList.value.filter((task) => task.status !== 'done' && !task.plannedDate).length
}))
const weekTop = computed(() =>
  boardTaskList.value.filter((task) => task.weekRank).sort((a, b) => (a.weekRank || 4) - (b.weekRank || 4))
)

async function loadWeek() {
  await tasksStore.loadTasks(week.value)
}

onMounted(async () => {
  await Promise.all([
    projectsStore.loadProjects(),
    loadWeek(),
    $fetch<AssignableUser[]>('/api/users/assignable').then((value) => {
      assignees.value = value
    })
  ])
  workspaceReady.value = true
  if (typeof route.query.task === 'string') {
    try {
      const details = await $fetch<{ task: Task }>(`/api/tasks/${route.query.task}/details`)
      if (details.task.week !== week.value) {
        week.value = details.task.week
        await loadWeek()
      }
      openEdit(tasksStore.tasks.find((item) => item.id === details.task.id) ?? details.task, false)
    } catch {
      await navigateTo({ query: { ...route.query, task: undefined } }, { replace: true })
    }
  }
})

watch(week, loadWeek)
useQueryTrigger('new', '1', workspaceReady, () => openCreate('todo'))
useLiveRefresh('tasks', loadWeek)

function openCreate(status: Task['status']) {
  editingTask.value = null
  editorDefaultStatus.value = status
  editorOpen.value = true
}

function openEdit(task: Task, syncQuery = true) {
  editingTask.value = task
  editorOpen.value = true
  if (syncQuery) void navigateTo({ query: { ...route.query, task: task.id, new: undefined } }, { replace: true })
}

function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
  void navigateTo({ query: { ...route.query, task: undefined, new: undefined } }, { replace: true })
}

async function handleSave(payload: {
  title: string
  note: string | null
  status: Task['status']
  projectId: string | null
  priority: TaskPriority
  dueDate: string | null
  tags: string[]
  recurrence: TaskRecurrence | null
  assigneeId: string | null
  stageId: string | null
}) {
  if (editingTask.value) {
    await tasksStore.patchTask(editingTask.value.id, payload)
  } else {
    const sort = tasksStore.tasksByStatus[payload.status].length
    await tasksStore.addTask({ ...payload, week: week.value, sort })
  }
  closeEditor()
}

async function handleQuickCreate(payload: {
  title: string
  status: Task['status']
  projectId: string | null
  assigneeId: string | null
  dueDate: string | null
  priority: TaskPriority
}) {
  await tasksStore.addTask({ ...payload, week: week.value, sort: tasksStore.tasksByStatus[payload.status].length })
}

async function handleSmartQuick(input: string, lanePatch: UpdateTaskInput) {
  const parsed = parseQuickTask(input, projectsStore.projects, assignees.value)
  if (!parsed.title) return
  await tasksStore.addTask({
    title: parsed.title,
    week: week.value,
    status: lanePatch.status || 'todo',
    priority: lanePatch.priority || parsed.priority,
    projectId: lanePatch.projectId !== undefined ? lanePatch.projectId : parsed.projectId,
    assigneeId: lanePatch.assigneeId !== undefined ? lanePatch.assigneeId : parsed.assigneeId,
    plannedDate: lanePatch.plannedDate !== undefined ? lanePatch.plannedDate : parsed.plannedDate,
    plannedTime: parsed.plannedTime,
    estimateMinutes: parsed.estimateMinutes,
    sort: tasksStore.tasks.length
  })
}

async function toggleWeekTop(task: Task) {
  if (task.weekRank) return patchTask(task.id, { weekRank: null })
  const used = new Set(weekTop.value.map((item) => item.weekRank))
  const rank = [1, 2, 3].find((value) => !used.has(value))
  if (rank) await patchTask(task.id, { weekRank: rank })
}
function addSelectedToTop() {
  const task = tasksStore.tasks.find((item) => item.id === selectedIds.value[0])
  if (task) void toggleWeekTop(task)
}

function handleUpdated(task: Task) {
  const index = tasksStore.tasks.findIndex((item) => item.id === task.id)
  if (index !== -1) tasksStore.tasks[index] = task
  editingTask.value = task
}

function handlePromoted(task: Task) {
  if (task.week === week.value) tasksStore.tasks.push(task)
}

const navigableTasks = computed(() => Object.values(boardTasks.value).flat())
function moveSelection(direction: -1 | 1) {
  if (!navigableTasks.value.length) return
  const current = selectedIds.value[0]
  const index = Math.max(
    0,
    navigableTasks.value.findIndex((item) => item.id === current)
  )
  const nextTask =
    navigableTasks.value[(index + direction + navigableTasks.value.length) % navigableTasks.value.length]!
  selectedIds.value = [nextTask.id]
}
useTaskKeyboard({
  enabled: computed(() => workspaceReady.value && !editorOpen.value),
  onCreate: () => openCreate('todo'),
  onEdit: () => {
    const task = tasksStore.tasks.find((item) => item.id === selectedIds.value[0])
    if (task) openEdit(task)
  },
  onClose: () => {
    selectedIds.value = []
    commandOpen.value = false
  },
  onSave: () => {},
  onSearch: () => searchInput.value?.focus(),
  onMove: moveSelection,
  onCommands: () => {
    commandOpen.value = true
  }
})

async function handleCycleStatus(task: Task) {
  await tasksStore.cycleStatus(task)
}

async function handleReorder(status: Task['status'], orderedTasks: Task[]) {
  await tasksStore.reorderColumn(status, orderedTasks)
}

async function handleDelete(id: string) {
  const previous = tasksStore.tasks.find((task) => task.id === id)
  if (!previous) return
  await tasksStore.patchTask(id, { archivedAt: Date.now() })
  offerUndo(t('board.taskArchived'), async () => {
    await tasksStore.patchTask(id, { archivedAt: null })
  })
}

function toggleSelected(id: string, selected: boolean) {
  selectedIds.value = selected
    ? [...new Set([...selectedIds.value, id])]
    : selectedIds.value.filter((item) => item !== id)
}
function getAssigneeName(id: string | null) {
  return assignees.value.find((person) => person.id === id)?.name ?? ''
}
async function patchTask(id: string, patch: UpdateTaskInput) {
  await tasksStore.patchTask(id, patch)
}
async function duplicate(id: string) {
  const task = await tasksStore.duplicate(id)
  offerUndo(t('board.copyCreated'), async () => {
    await tasksStore.removeTask(task.id)
  })
}
function offerUndo(label: string, run: () => Promise<void>) {
  undoAction.value = { label, run }
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => {
    undoAction.value = null
  }, 8000)
}
async function undo() {
  const action = undoAction.value
  undoAction.value = null
  if (action) await action.run()
}
async function bulkPatch(patch: UpdateTaskInput) {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  const before = tasksStore.tasks
    .filter((task) => ids.includes(task.id))
    .map((task) => ({
      id: task.id,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      projectId: task.projectId,
      dueDate: task.dueDate,
      week: task.week,
      archivedAt: task.archivedAt
    }))
  await tasksStore.bulkPatch(ids, patch)
  selectedIds.value = []
  offerUndo(t('board.tasksChanged', { count: ids.length }), async () => {
    await Promise.all(before.map((item) => tasksStore.patchTask(item.id, item)))
  })
}

async function handleMoveIncomplete() {
  await tasksStore.moveIncompleteToNextWeek(week.value)
}

async function handleSaveProject(payload: { name: string; color: string }) {
  await projectsStore.addProject(payload)
  projectEditorOpen.value = false
}

async function handleDeleteProject(id: string) {
  await projectsStore.removeProject(id)
  if (tasksStore.filterProjectId === id) {
    tasksStore.filterProjectId = null
  }
  await loadWeek()
}

async function logout() {
  await clear()
  await navigateTo('/login')
}

async function saveView() {
  const name = window.prompt(t('board.viewName'))?.trim()
  if (!name) return
  await $fetch('/api/views', {
    method: 'POST',
    body: {
      name,
      filters: { search: search.value, priority: priorityFilter.value, projectId: tasksStore.filterProjectId }
    }
  })
}
</script>

<template>
  <div class="week-board-page app-container board-workspace">
    <PageHeader
      :title="$t('board.title')"
      :description="$t('board.description')"
      icon="i-lucide-layout-dashboard"
    >
      <template #actions
        ><div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            v-model="tasksStore.filterProjectId"
            :aria-label="$t('board.projectFilter')"
            class="h-10 min-w-40 flex-1 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 text-sm outline-none sm:flex-none"
          >
            <option :value="null">{{ $t('board.allProjects') }}</option>
            <option
              v-for="project in projectsStore.projects"
              :key="project.id"
              :value="project.id"
            >
              {{ project.name }}
            </option>
          </select>
          <button
            type="button"
            class="text-secondary inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 text-sm font-semibold hover:text-[var(--color-text-primary)]"
            :title="$t('board.manageProjects')"
            @click="projectEditorOpen = true"
          >
            <UIcon
              name="i-lucide-folder-kanban"
              class="size-4"
            />{{ $t('board.projects') }}
          </button>
        </div></template
      >
    </PageHeader>

    <div class="board-toolbar mb-4">
      <label class="flex min-w-0 flex-1 items-center gap-2.5 px-3.5"
        ><UIcon
          name="i-lucide-search"
          class="text-secondary size-4"
        /><input
          ref="searchInput"
          v-model="search"
          class="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
          :placeholder="$t('board.findTask')"
        /><kbd
          class="text-secondary hidden rounded-md border border-[var(--color-panel-border)] px-1.5 py-0.5 text-[10px] md:inline"
          >⌘ K</kbd
        ></label
      >
      <div class="hidden h-6 w-px bg-[var(--color-panel-border)] md:block" />
      <select
        v-model="priorityFilter"
        :aria-label="$t('board.priorityFilter')"
        class="h-11 bg-transparent px-3 text-sm outline-none"
      >
        <option :value="null">{{ $t('board.allPriorities') }}</option>
        <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option>
        <option value="high">{{ $t('task.priorityValue.high') }}</option>
        <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
        <option value="low">{{ $t('task.priorityValue.low') }}</option>
      </select>
      <select
        v-model="assigneeFilter"
        :aria-label="$t('task.assignee')"
        class="h-11 bg-transparent px-3 text-sm outline-none"
      >
        <option :value="null">{{ $t('pages.analytics.allAssignees') }}</option>
        <option
          v-for="person in assignees"
          :key="person.id"
          :value="person.id"
        >
          {{ person.name }}
        </option>
      </select>
      <UButton
        v-if="statusFilter"
        size="xs"
        color="neutral"
        variant="soft"
        icon="i-lucide-filter-x"
        @click="statusFilter = null"
      >
        {{ $t(`task.statusValue.${statusFilter}`) }}
      </UButton>
      <button
        class="text-secondary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
        @click="saveView"
      >
        <UIcon
          name="i-lucide-bookmark-plus"
          class="size-4"
        /><span class="hidden sm:inline">{{ $t('board.saveView') }}</span>
      </button>
      <div class="flex rounded-lg bg-[var(--color-bg-alt)] p-1">
        <button
          class="grid size-8 place-items-center rounded-md"
          :class="viewMode === 'board' ? 'bg-[var(--color-panel-bg)] shadow-sm' : 'text-secondary'"
          :title="$t('nav.board')"
          @click="viewMode = 'board'"
        >
          <UIcon name="i-lucide-columns-3" /></button
        ><button
          class="grid size-8 place-items-center rounded-md"
          :class="viewMode === 'table' ? 'bg-[var(--color-panel-bg)] shadow-sm' : 'text-secondary'"
          :title="$t('board.table')"
          @click="viewMode = 'table'"
        >
          <UIcon name="i-lucide-table-2" />
        </button>
      </div>
    </div>

    <div class="week-board-page__modebar">
      <div
        class="week-board-page__modes"
        role="tablist"
        :aria-label="$t('board.groupBy')"
      >
        <button
          v-for="mode in ['status', 'day', 'assignee', 'project', 'priority'] as BoardMode[]"
          :key="mode"
          :class="{ 'week-board-page__mode--active': boardMode === mode }"
          @click="boardMode = mode"
        >
          <UIcon
            :name="
              (
                {
                  status: 'i-lucide-columns-3',
                  day: 'i-lucide-calendar-days',
                  assignee: 'i-lucide-users',
                  project: 'i-lucide-folder-kanban',
                  priority: 'i-lucide-flag'
                } as Record<BoardMode, string>
              )[mode]
            "
          /><span>{{ $t(`board.mode.${mode}`) }}</span>
        </button>
      </div>
      <div class="week-board-page__density">
        <button
          v-for="density in ['comfortable', 'compact', 'titles'] as const"
          :key="density"
          :class="{ 'week-board-page__density-button--active': boardDensity === density }"
          :title="$t(`board.density.${density}`)"
          @click="boardDensity = density"
        >
          <UIcon
            :name="
              density === 'comfortable'
                ? 'i-lucide-rows-3'
                : density === 'compact'
                  ? 'i-lucide-rows-4'
                  : 'i-lucide-list'
            "
          />
        </button>
      </div>
    </div>

    <section
      class="week-board-page__insights"
      :aria-label="$t('board.insights')"
    >
      <div>
        <UIcon name="i-lucide-hourglass" /><strong>{{ boardInsights.estimate }}</strong
        ><span>{{ $t('board.minutesPlanned') }}</span>
      </div>
      <div :class="{ 'week-board-page__insight--warning': boardInsights.overdue }">
        <UIcon name="i-lucide-triangle-alert" /><strong>{{ boardInsights.overdue }}</strong
        ><span>{{ $t('nav.overdue') }}</span>
      </div>
      <div>
        <UIcon name="i-lucide-user-x" /><strong>{{ boardInsights.unassigned }}</strong
        ><span>{{ $t('board.unassignedTasks') }}</span>
      </div>
      <div>
        <UIcon name="i-lucide-calendar-x" /><strong>{{ boardInsights.unplanned }}</strong
        ><span>{{ $t('board.unplannedTasks') }}</span>
      </div>
    </section>

    <section class="week-board-page__top">
      <header>
        <div>
          <UIcon name="i-lucide-trophy" />
          <h2>{{ $t('board.weekTop') }}</h2>
          <span>{{ weekTop.length }}/3</span>
        </div>
        <p>{{ $t('board.weekTopHint') }}</p>
      </header>
      <div class="week-board-page__top-list">
        <button
          v-for="task in weekTop"
          :key="task.id"
          @click="openEdit(task)"
        >
          <b>{{ task.weekRank }}</b
          ><span>{{ task.title }}</span
          ><UIcon name="i-lucide-arrow-up-right" /></button
        ><button
          v-if="weekTop.length < 3"
          class="week-board-page__top-add"
          @click="addSelectedToTop"
        >
          <UIcon name="i-lucide-plus" />{{
            selectedIds.length ? $t('board.addSelectedTop') : $t('board.selectTopHint')
          }}
        </button>
      </div>
    </section>

    <div class="mb-4 grid gap-3 lg:grid-cols-[minmax(24rem,.9fr)_minmax(28rem,1.1fr)]">
      <WeekSwitcher
        class="flex-1"
        :week="week"
        :label="label"
        :is-current-week="isCurrentWeek"
        @prev="prev"
        @next="next"
        @today="goToCurrent"
      />
      <WeekSummary
        class="flex-1"
        :total="tasksStore.filteredTasks.length"
        :done="tasksStore.tasksByStatus.done.length"
        @move-incomplete="handleMoveIncomplete"
      />
    </div>

    <WeekBoardV3
      v-if="viewMode === 'board'"
      :tasks="boardTaskList"
      :week="week"
      :mode="boardMode"
      :selected-ids="selectedIds"
      :projects="projectsStore.projects"
      :assignees="assignees"
      :density="boardDensity"
      @edit="openEdit"
      @select="toggleSelected"
      @patch="patchTask"
      @quick="handleSmartQuick"
      @delete="handleDelete"
      @duplicate="duplicate"
    />
    <TaskTable
      v-else
      :tasks="Object.values(boardTasks).flat()"
      :selected-ids="selectedIds"
      :assignees="assignees"
      @edit="openEdit"
      @select="toggleSelected"
      @patch="patchTask"
    />

    <div
      v-if="selectedIds.length"
      class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-2 shadow-2xl"
    >
      <strong class="px-2 text-sm">{{ selectedIds.length }} {{ $t('board.selected') }}</strong
      ><button
        class="rounded-lg px-3 py-2 text-xs hover:bg-[var(--color-bg-alt)]"
        @click="bulkPatch({ status: 'done' })"
      >
        {{ $t('board.complete') }}</button
      ><select
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        :aria-label="$t('task.priority')"
        @change="bulkPatch({ priority: ($event.target as HTMLSelectElement).value as TaskPriority })"
      >
        <option value="">{{ $t('task.priority') }}</option>
        <option
          v-for="priority in ['urgent', 'high', 'medium', 'low'] as const"
          :key="priority"
          :value="priority"
        >
          {{ $t(`task.priorityValue.${priority}`) }}
        </option></select
      ><select
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        @change="bulkPatch({ assigneeId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">{{ $t('board.assign') }}</option>
        <option
          v-for="person in assignees"
          :key="person.id"
          :value="person.id"
        >
          {{ person.name }}
        </option></select
      ><select
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        :aria-label="$t('task.project')"
        @change="bulkPatch({ projectId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">{{ $t('board.changeProject') }}</option>
        <option
          v-for="project in projectsStore.projects"
          :key="project.id"
          :value="project.id"
        >
          {{ project.name }}
        </option></select
      ><input
        type="date"
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        :aria-label="$t('task.plannedDate')"
        @change="bulkPatch({ plannedDate: ($event.target as HTMLInputElement).value || null })"
      /><select
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        :aria-label="$t('board.blockedBy')"
        @change="bulkPatch({ blockedByTaskId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">{{ $t('board.blockedBy') }}</option>
        <option
          v-for="task in boardTaskList.filter((item) => !selectedIds.includes(item.id))"
          :key="task.id"
          :value="task.id"
        >
          {{ task.title }}
        </option></select
      ><input
        type="date"
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        :aria-label="$t('task.deadline')"
        @change="bulkPatch({ dueDate: ($event.target as HTMLInputElement).value || null })"
      /><input
        :value="week"
        type="week"
        class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
        :aria-label="$t('board.moveWeek')"
        @change="bulkPatch({ week: ($event.target as HTMLInputElement).value })"
      /><button
        class="rounded-lg px-3 py-2 text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg-alt)]"
        @click="bulkPatch({ archivedAt: Date.now() })"
      >
        {{ $t('common.archive') }}</button
      ><button
        class="grid size-8 place-items-center"
        @click="selectedIds = []"
      >
        <UIcon name="i-lucide-x" />
      </button>
    </div>
    <div
      v-if="undoAction"
      class="fixed right-5 bottom-5 z-50 flex items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-2xl"
    >
      <span>{{ undoAction.label }}</span
      ><button
        class="font-semibold text-orange-400"
        @click="undo"
      >
        {{ $t('common.cancel') }}
      </button>
    </div>

    <TaskEditor
      :open="editorOpen"
      :task="editingTask"
      :default-status="editorDefaultStatus"
      :projects="projectsStore.projects"
      :assignees="assignees"
      :tag-options="reusableTags"
      @close="closeEditor"
      @save="handleSave"
      @updated="handleUpdated"
      @promoted="handlePromoted"
    />

    <ProjectEditor
      :open="projectEditorOpen"
      :projects="projectsStore.projects"
      @close="projectEditorOpen = false"
      @save="handleSaveProject"
      @delete="handleDeleteProject"
    />
    <TaskCommandMenu
      :open="commandOpen"
      @close="commandOpen = false"
      @create="openCreate('todo')"
      @search="searchInput?.focus()"
      @complete-selected="bulkPatch({ status: 'done' })"
      @archive-selected="bulkPatch({ archivedAt: Date.now() })"
    />
  </div>
</template>

<style scoped>
.week-board-page__modebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.65rem;
}
.week-board-page__modes,
.week-board-page__density {
  display: flex;
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
}
.week-board-page__modes button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.65rem;
  border-radius: 0.55rem;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 650;
}
.week-board-page__mode--active,
.week-board-page__density-button--active {
  background: var(--color-bg-alt);
  color: var(--color-accent) !important;
}
.week-board-page__density button {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: var(--color-text-secondary);
}
.week-board-page__insights {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}
.week-board-page__insights > div {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.05rem 0.45rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
}
.week-board-page__insights svg {
  grid-row: 1/3;
  color: var(--color-accent);
}
.week-board-page__insights strong {
  font-size: 0.9rem;
}
.week-board-page__insights span {
  color: var(--color-text-secondary);
  font-size: 0.63rem;
}
.week-board-page__insight--warning {
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-panel-border)) !important;
}
.week-board-page__insight--warning svg,
.week-board-page__insight--warning strong {
  color: var(--color-danger);
}
.week-board-page__top {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-panel-border));
  border-radius: 0.85rem;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-accent) 7%, var(--color-panel-bg)),
    var(--color-panel-bg)
  );
}
.week-board-page__top header > div {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.week-board-page__top header svg {
  color: var(--color-accent);
}
.week-board-page__top h2 {
  font-size: 0.78rem;
  font-weight: 750;
}
.week-board-page__top header span {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.week-board-page__top header p {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}
.week-board-page__top-list {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
  overflow-x: auto;
}
.week-board-page__top-list button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 16rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.6rem;
  background: var(--color-panel-bg);
  font-size: 0.7rem;
}
.week-board-page__top-list b {
  display: grid;
  place-items: center;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 0.35rem;
  background: var(--color-accent);
  color: white;
}
.week-board-page__top-list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.week-board-page__top-add {
  border-style: dashed !important;
  color: var(--color-text-secondary);
}
@media (max-width: 760px) {
  .week-board-page__modebar {
    align-items: flex-start;
  }
  .week-board-page__modes {
    max-width: calc(100vw - 5.5rem);
    overflow-x: auto;
  }
  .week-board-page__modes button span {
    display: none;
  }
  .week-board-page__insights {
    grid-template-columns: 1fr 1fr;
  }
  .week-board-page__top {
    grid-template-columns: 1fr;
  }
  .week-board-page__top-list {
    justify-content: flex-start;
  }
  .week-board-page__top header p {
    display: none;
  }
}
</style>
