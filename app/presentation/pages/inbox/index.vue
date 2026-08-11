<script setup lang="ts">
import type { AssignableUser, Task, TaskPriority } from '~/domain/entities/task'
import { getCurrentWeek } from '~/domain/services/week'

const { t } = useI18n()
const route = useRoute()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()

const loading = ref(true)
const assignees = ref<AssignableUser[]>([])
const selectedId = ref<string | null>(null)
const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const undoAction = ref<null | { label: string; run: () => Promise<void> }>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined

const quickCreateRef = useTemplateRef<{ focus: () => void }>('quickCreate')

const sharedTitle = computed(() => {
  const value = route.query.text ?? route.query.title
  return typeof value === 'string' ? value : ''
})

const reusableTags = computed(() =>
  [...new Set(tasksStore.inboxTasks.flatMap((task) => task.tags ?? []))].sort((a, b) => a.localeCompare(b, 'uk'))
)

const selectedTask = computed(() => tasksStore.inboxTasks.find((task) => task.id === selectedId.value) ?? null)

onMounted(async () => {
  try {
    await Promise.all([
      tasksStore.loadInboxTasks(),
      projectsStore.projects.length ? Promise.resolve() : projectsStore.loadProjects(),
      $fetch<AssignableUser[]>('/api/users/assignable')
        .then((users) => (assignees.value = users))
        .catch(() => {})
    ])
  } finally {
    loading.value = false
  }
})

useLiveRefresh('tasks', () => tasksStore.loadInboxTasks())

function isStale(task: Task) {
  return Date.now() - task.createdAt > 3 * 86_400_000
}
function staleDays(task: Task) {
  return Math.floor((Date.now() - task.createdAt) / 86_400_000)
}

async function handleCreate(payload: {
  title: string
  status: Task['status']
  projectId: string | null
  assigneeId: string | null
  dueDate: string | null
  priority: TaskPriority
}) {
  await tasksStore.addInboxTask({ ...payload, week: getCurrentWeek() })
}

function openFullEditor() {
  editingTask.value = null
  editorOpen.value = true
}

function openEditor(task: Task) {
  selectedId.value = task.id
  editingTask.value = task
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

async function handleSave(payload: {
  title: string
  note: string | null
  status: Task['status']
  projectId: string | null
  priority: TaskPriority
  dueDate: string | null
  tags: string[]
  recurrence: Task['recurrence']
  assigneeId: string | null
  stageId: string | null
}) {
  await tasksStore.addInboxTask({ ...payload, week: getCurrentWeek() })
  editorOpen.value = false
}

function handleUpdated(task: Task) {
  tasksStore.syncInboxTaskFromEditor(task)
}
function handlePromoted(task: Task) {
  tasksStore.syncInboxTaskFromEditor(task)
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

async function complete(task: Task) {
  const snapshot = { ...task }
  await tasksStore.patchInboxTask(task.id, { status: 'done' })
  offerUndo(t('pages.inbox.completedUndo'), async () => {
    await tasksStore.restoreCompletedInboxTask(snapshot)
  })
}

async function dismiss(task: Task) {
  const snapshot = { ...task }
  await tasksStore.removeInboxTask(task.id)
  offerUndo(t('pages.inbox.deletedUndo'), async () => {
    await tasksStore.recreateInboxTask(snapshot)
  })
}

function moveSelection(direction: -1 | 1) {
  const list = tasksStore.inboxTasks
  if (!list.length) return
  const current = list.findIndex((task) => task.id === selectedId.value)
  const nextIndex = Math.min(list.length - 1, Math.max(0, current + direction))
  selectedId.value = list[nextIndex]!.id
}

useTaskKeyboard({
  enabled: computed(() => !editorOpen.value),
  onCreate: () => quickCreateRef.value?.focus(),
  onEdit: () => selectedTask.value && openEditor(selectedTask.value),
  onClose: () => (selectedId.value = null),
  onSave: () => {},
  onMove: moveSelection,
  onSearch: () => {},
  onCommands: () => {}
})

const PRIORITY_BY_DIGIT: Record<string, TaskPriority> = { '1': 'low', '2': 'medium', '3': 'high', '4': 'urgent' }
useEventListener('keydown', (event) => {
  if (editorOpen.value) return
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
  const priority = PRIORITY_BY_DIGIT[event.key]
  const task = selectedTask.value
  if (!priority || !task) return
  void tasksStore.patchInboxTask(task.id, { priority })
})
</script>

<template>
  <div class="inbox-page app-container max-w-5xl">
    <PageHeader
      title="Inbox"
      :description="$t('pages.inbox.description')"
      icon="i-lucide-inbox"
      :count="tasksStore.inboxTasks.length"
    />
    <TaskQuickCreate
      ref="quickCreate"
      class="mb-3"
      status="todo"
      :projects="projectsStore.projects"
      :assignees="assignees"
      :initial-title="sharedTitle"
      @create="handleCreate"
      @full="openFullEditor"
      @close="() => {}"
    />
    <div
      v-if="loading"
      class="space-y-2"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-14 rounded-xl"
      />
    </div>
    <EmptyState
      v-else-if="!tasksStore.inboxTasks.length"
      :title="$t('pages.inbox.empty')"
      :description="$t('pages.inbox.emptyHint')"
      icon="i-lucide-inbox-check"
    />
    <div
      v-else
      class="surface-card divide-y divide-[var(--color-panel-border)]"
    >
      <article
        v-for="task in tasksStore.inboxTasks"
        :key="task.id"
        class="flex items-center gap-3 p-3"
        :class="[
          task.id === selectedId ? 'bg-black/[0.04] dark:bg-white/[0.05]' : '',
          isStale(task) ? 'border-l-2 border-amber-500/60' : ''
        ]"
        @click="openEditor(task)"
      >
        <button
          :title="$t('taskActions.complete')"
          @click.stop="complete(task)"
        >
          <UIcon
            name="i-lucide-circle"
            class="text-secondary size-5"
          />
        </button>
        <span class="min-w-0 flex-1 truncate font-medium">{{ task.title }}</span>
        <span
          v-if="isStale(task)"
          class="text-xs text-amber-600"
          >{{ $t('pages.inbox.staleDays', { days: staleDays(task) }) }}</span
        >
        <span class="text-secondary text-xs">{{ task.week }}</span>
        <IconButton
          icon="i-lucide-trash-2"
          :label="$t('taskActions.delete')"
          size="sm"
          @click.stop="dismiss(task)"
        />
      </article>
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
      :projects="projectsStore.projects"
      :assignees="assignees"
      :tag-options="reusableTags"
      @close="closeEditor"
      @save="handleSave"
      @updated="handleUpdated"
      @promoted="handlePromoted"
    />
  </div>
</template>
