<script setup lang="ts">
import type { Task, TaskPriority, TaskRecurrence } from '~/domain/entities/task'

const { week, label, isCurrentWeek, next, prev, goToCurrent } = useWeek()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const route = useRoute()
const { user, clear } = useUserSession()

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
const priorityFilter = ref<TaskPriority | null>(null)

const boardTasks = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = tasksStore.tasksByStatus
  return Object.fromEntries(Object.entries(source).map(([status, tasks]) => [status, tasks.filter(task =>
    (!term || `${task.title} ${task.note ?? ''} ${(task.tags ?? []).join(' ')}`.toLowerCase().includes(term))
    && (!priorityFilter.value || task.priority === priorityFilter.value)
    && !task.archivedAt
  )])) as Record<Task['status'], Task[]>
})

async function loadWeek() {
  await tasksStore.loadTasks(week.value)
}

onMounted(async () => {
  await Promise.all([projectsStore.loadProjects(), loadWeek()])
  if (route.query.new === '1') openCreate('todo')
})

watch(week, loadWeek)

function openCreate(status: Task['status']) {
  editingTask.value = null
  editorDefaultStatus.value = status
  editorOpen.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
}

async function handleSave(payload: { title: string; note: string | null; status: Task['status']; projectId: string | null; priority: TaskPriority; dueDate: string | null; tags: string[]; recurrence: TaskRecurrence | null }) {
  if (editingTask.value) {
    await tasksStore.patchTask(editingTask.value.id, payload)
  } else {
    const sort = tasksStore.tasksByStatus[payload.status].length
    await tasksStore.addTask({ ...payload, week: week.value, sort })
  }
  closeEditor()
}

async function handleCycleStatus(task: Task) {
  await tasksStore.cycleStatus(task)
}

async function handleReorder(status: Task['status'], orderedTasks: Task[]) {
  await tasksStore.reorderColumn(status, orderedTasks)
}

async function handleDelete(id: string) {
  await tasksStore.removeTask(id)
}

async function handleMoveIncomplete() {
  await tasksStore.moveIncompleteToNextWeek(week.value)
}

async function handleSaveProject(payload: { name: string; color: string }) {
  await projectsStore.addProject(payload)
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
  const name = window.prompt('Назва представлення')?.trim()
  if (!name) return
  await $fetch('/api/views', { method: 'POST', body: { name, filters: { search: search.value, priority: priorityFilter.value, projectId: tasksStore.filterProjectId } } })
}
</script>

<template>
  <div class="mx-auto max-w-[1800px] px-5 py-8 md:px-10 xl:px-12">
    <header class="mb-8 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div><h1 class="font-display text-3xl">Дошка тижня</h1><p class="mt-1 text-sm text-secondary">Плануйте, фокусуйтеся, завершуйте.</p></div>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="tasksStore.filterProjectId"
          class="rounded-full border border-black/10 bg-black/[0.02] px-4 py-2 text-sm outline-none"
        >
          <option :value="null">Усі проєкти</option>
          <option v-for="project in projectsStore.projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
        <button
          type="button"
          class="rounded-full border border-black/10 px-4 py-2 text-sm text-secondary hover:text-black"
          title="Керування проєктами"
          @click="projectEditorOpen = true"
        >
          Проєкти
        </button>
      </div>
    </header>

    <div class="mb-5 flex flex-wrap gap-3">
      <label class="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-4"><UIcon name="i-lucide-search" class="size-4 text-secondary"/><input v-model="search" class="h-11 flex-1 bg-transparent text-sm outline-none" placeholder="Пошук за назвою, нотаткою або тегом"></label>
      <select v-model="priorityFilter" class="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-4 text-sm"><option :value="null">Усі пріоритети</option><option value="urgent">Термінові</option><option value="high">Високі</option><option value="medium">Середні</option><option value="low">Низькі</option></select>
      <button class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-4 text-sm" @click="saveView"><UIcon name="i-lucide-bookmark-plus"/>Зберегти view</button>
    </div>

    <div class="mb-6 flex flex-col gap-4 lg:flex-row">
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

    <WeekBoard
      :tasks-by-status="boardTasks"
      :get-project="projectsStore.getProject"
      @edit="openEdit"
      @delete="handleDelete"
      @cycle-status="handleCycleStatus"
      @add-task="openCreate"
      @reorder="handleReorder"
    />

    <TaskEditor
      :open="editorOpen"
      :task="editingTask"
      :default-status="editorDefaultStatus"
      :projects="projectsStore.projects"
      @close="closeEditor"
      @save="handleSave"
    />

    <ProjectEditor
      :open="projectEditorOpen"
      :projects="projectsStore.projects"
      @close="projectEditorOpen = false"
      @save="handleSaveProject"
      @delete="handleDeleteProject"
    />
  </div>
</template>
