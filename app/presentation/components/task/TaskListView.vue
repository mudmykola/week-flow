<script setup lang="ts">
import { addDays } from 'date-fns'
import { fetchArchivedTasks, fetchDueTasks } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task } from '~/domain/entities/task'
import { priorityColors } from '~/domain/services/taskLabels'
import { getCurrentWeek } from '~/domain/services/week'

const props = defineProps<{ mode: 'today' | 'upcoming' | 'overdue' | 'archive'; title: string; icon: string }>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const today = new Date().toISOString().slice(0, 10)
const tomorrow = addDays(new Date(), 1).toISOString().slice(0, 10)

const editorOpen = ref(false)
const editingTask = ref<Task | null>(null)
const undoAction = ref<null | { label: string; run: () => Promise<void> }>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined

const overdueTasks = computed(() =>
  tasksStore.listTasks
    .filter((task) => !task.archivedAt && task.dueDate && task.dueDate < today && task.status !== 'done')
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
)
const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
const visibleTasks = computed(() => {
  if (props.mode === 'archive') return tasksStore.listTasks.filter((task) => Boolean(task.archivedAt))
  if (props.mode === 'today')
    return tasksStore.listTasks
      .filter((task) => !task.archivedAt && task.dueDate === today)
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  if (props.mode === 'upcoming')
    return tasksStore.listTasks
      .filter((task) => !task.archivedAt && task.dueDate && task.dueDate > today)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  return overdueTasks.value
})
const doneCount = computed(() => visibleTasks.value.filter((task) => task.status === 'done').length)
const modeKey = computed(() => props.mode.charAt(0).toUpperCase() + props.mode.slice(1))
const emptyTitle = computed(() => t(`taskActions.empty${modeKey.value}`))
const emptyHint = computed(() => t(`taskActions.empty${modeKey.value}Hint`))

onMounted(async () => {
  try {
    await Promise.all([
      tasksStore.loadListTasks(props.mode === 'archive' ? fetchArchivedTasks : fetchDueTasks),
      projectsStore.projects.length ? Promise.resolve() : projectsStore.loadProjects(),
      $fetch<AssignableUser[]>('/api/users/assignable')
        .then((users) => (assignees.value = users))
        .catch(() => {})
    ])
  } finally {
    loading.value = false
  }
})

async function toggleDone(task: Task) {
  const snapshot = { ...task }
  await tasksStore.patchListTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
  if (snapshot.status !== 'done') {
    offerUndo(t('taskActions.completedUndo'), async () => {
      await tasksStore.patchListTask(task.id, { status: snapshot.status })
    })
  }
}

async function toggleArchive(task: Task) {
  await tasksStore.patchListTask(task.id, { archivedAt: task.archivedAt ? null : Date.now() })
}

async function snooze(task: Task) {
  await tasksStore.patchListTask(task.id, { dueDate: tomorrow })
}

async function dismiss(task: Task) {
  const snapshot = { ...task }
  await tasksStore.removeListTask(task.id)
  offerUndo(t('taskActions.deletedUndo'), async () => {
    await tasksStore.recreateListTask(snapshot)
  })
}

async function handleCreate(payload: {
  title: string
  status: Task['status']
  projectId: string | null
  assigneeId: string | null
  dueDate: string | null
  priority: Task['priority']
}) {
  await tasksStore.addListTask({ ...payload, week: getCurrentWeek() })
}

function openEditor(task: Task) {
  editingTask.value = task
  editorOpen.value = true
}
function openFullEditor() {
  editingTask.value = null
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
  priority: Task['priority']
  dueDate: string | null
  tags: string[]
  recurrence: Task['recurrence']
  assigneeId: string | null
  stageId: string | null
}) {
  await tasksStore.addListTask({ ...payload, week: getCurrentWeek() })
  editorOpen.value = false
}
function handleUpdated(task: Task) {
  tasksStore.syncListTask(task)
}
function handlePromoted(task: Task) {
  tasksStore.syncListTask(task)
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
</script>

<template>
  <div class="task-list-view app-container max-w-5xl">
    <PageHeader
      :title="title"
      :icon="icon"
      :count="visibleTasks.length"
    />
    <p
      v-if="mode === 'today' && visibleTasks.length"
      class="text-secondary -mt-2 mb-3 text-sm"
    >
      {{ $t('taskActions.progress', { done: doneCount, total: visibleTasks.length }) }}
    </p>
    <TaskQuickCreate
      v-if="mode === 'today'"
      class="mb-3"
      status="todo"
      :projects="projectsStore.projects"
      :assignees="assignees"
      :initial-due-date="today"
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
        class="h-16 w-full rounded-xl"
      />
    </div>
    <template v-else>
      <section
        v-if="mode === 'today' && overdueTasks.length"
        class="mb-4"
      >
        <h2 class="mb-2 text-sm font-semibold text-[var(--color-danger)]">{{ $t('taskActions.overdueSection') }}</h2>
        <div class="space-y-3">
          <article
            v-for="task in overdueTasks"
            :key="task.id"
            class="glass-card flex items-center gap-3 border-l-2 border-[var(--color-danger)] p-3"
            @click="openEditor(task)"
          >
            <button
              :title="$t('taskActions.complete')"
              @click.stop="toggleDone(task)"
            >
              <UIcon
                name="i-lucide-circle"
                class="text-secondary size-5"
              />
            </button>
            <span
              class="size-2 shrink-0 rounded-full"
              :style="{ background: priorityColors[task.priority] }"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ task.title }}</p>
              <div class="text-secondary mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span class="text-[var(--color-danger)]">{{ task.dueDate }}</span>
                <ProjectBadge :project="projectsStore.getProject(task.projectId)" />
              </div>
            </div>
            <IconButton
              icon="i-lucide-calendar-arrow-up"
              :label="$t('taskActions.snooze')"
              size="sm"
              @click.stop="snooze(task)"
            />
            <IconButton
              icon="i-lucide-trash-2"
              :label="$t('taskActions.delete')"
              size="sm"
              @click.stop="dismiss(task)"
            />
          </article>
        </div>
      </section>

      <h2
        v-if="mode === 'today' && overdueTasks.length && visibleTasks.length"
        class="mb-2 text-sm font-semibold"
      >
        {{ $t('taskActions.todaySection') }}
      </h2>
      <div
        v-if="visibleTasks.length"
        class="space-y-3"
      >
        <article
          v-for="task in visibleTasks"
          :key="task.id"
          class="glass-card flex items-center gap-3 p-3"
          @click="openEditor(task)"
        >
          <button
            :title="task.status === 'done' ? $t('taskActions.return') : $t('taskActions.complete')"
            @click.stop="toggleDone(task)"
          >
            <UIcon
              :name="task.status === 'done' ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
              class="size-5"
              :class="task.status === 'done' ? 'text-[var(--color-accent)]' : 'text-secondary'"
            />
          </button>
          <span
            v-if="task.status !== 'done'"
            class="size-2 shrink-0 rounded-full"
            :style="{ background: priorityColors[task.priority] }"
          />
          <div class="min-w-0 flex-1">
            <p
              class="truncate font-medium"
              :class="task.status === 'done' ? 'text-secondary line-through' : ''"
            >
              {{ task.title }}
            </p>
            <div class="text-secondary mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span v-if="task.dueDate">{{ task.dueDate }}</span>
              <ProjectBadge :project="projectsStore.getProject(task.projectId)" />
              <span
                v-for="tag in task.tags"
                :key="tag"
                >#{{ tag }}</span
              >
            </div>
          </div>
          <IconButton
            v-if="mode === 'today' || mode === 'overdue'"
            icon="i-lucide-calendar-arrow-up"
            :label="$t('taskActions.snooze')"
            size="sm"
            @click.stop="snooze(task)"
          />
          <IconButton
            :icon="task.archivedAt ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
            :label="task.archivedAt ? $t('taskActions.restore') : $t('taskActions.archive')"
            size="sm"
            @click.stop="toggleArchive(task)"
          />
          <IconButton
            icon="i-lucide-trash-2"
            :label="$t('taskActions.delete')"
            size="sm"
            @click.stop="dismiss(task)"
          />
        </article>
      </div>
      <EmptyState
        v-else-if="!(mode === 'today' && overdueTasks.length)"
        :title="emptyTitle"
        :description="emptyHint"
        :icon="icon"
      />
    </template>

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
      @close="closeEditor"
      @save="handleSave"
      @updated="handleUpdated"
      @promoted="handlePromoted"
    />
  </div>
</template>
