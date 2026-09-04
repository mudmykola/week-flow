<script setup lang="ts">
import { addDays, format, parseISO } from 'date-fns'
import { bulkUpdateTasks, fetchBacklogTasks, updateTask } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task, TaskPriority, UpdateTaskInput } from '~/domain/entities/task'
import { backlogTasks } from '~/domain/services/planning'
import { dateToWeek } from '~/domain/services/week'
import { localDateKey } from '~/domain/services/today'

const route = useRoute()
const { t } = useI18n()
const projectsStore = useProjectsStore()
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(true)
const error = ref(false)
const search = ref('')
const priority = ref<TaskPriority | ''>('')
const projectId = ref('')
const selected = ref<string[]>([])
const bulkDate = ref(localDateKey())
const editingTask = ref<Task | null>(null)
const editorOpen = ref(false)
const savingIds = ref(new Set<string>())
const today = localDateKey()
const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd')

const source = computed(() => backlogTasks(tasks.value))
const visibleTasks = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('uk')
  return source.value.filter(
    (task) =>
      (!term || `${task.title} ${task.note ?? ''} ${task.tags.join(' ')}`.toLocaleLowerCase('uk').includes(term)) &&
      (!priority.value || task.priority === priority.value) &&
      (!projectId.value || task.projectId === projectId.value)
  )
})
const stats = computed(() => ({
  urgent: source.value.filter((task) => task.priority === 'urgent' || task.priority === 'high').length,
  withoutEstimate: source.value.filter((task) => !task.estimateMinutes).length,
  stale: source.value.filter((task) => Date.now() - task.createdAt >= 7 * 86_400_000).length
}))

onMounted(load)
useLiveRefresh('tasks', load)

async function load() {
  loading.value = true
  error.value = false
  try {
    const [taskItems, people] = await Promise.all([
      fetchBacklogTasks(),
      $fetch<AssignableUser[]>('/api/users/assignable').catch(() => [])
    ])
    tasks.value = taskItems
    assignees.value = people
    if (!projectsStore.projects.length) await projectsStore.loadProjects()
    if (typeof route.query.task === 'string') {
      const task = tasks.value.find((item) => item.id === route.query.task)
      if (task) openTask(task, false)
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function toggleSelected(id: string, checked: boolean) {
  selected.value = checked ? [...new Set([...selected.value, id])] : selected.value.filter((item) => item !== id)
}

async function patchTask(task: Task, patch: UpdateTaskInput) {
  if (savingIds.value.has(task.id)) return
  savingIds.value = new Set([...savingIds.value, task.id])
  const snapshot = { ...task }
  Object.assign(task, patch)
  try {
    const saved = await updateTask(task.id, patch)
    const index = tasks.value.findIndex((item) => item.id === task.id)
    if (index !== -1) tasks.value[index] = saved
  } catch {
    Object.assign(task, snapshot)
  } finally {
    const next = new Set(savingIds.value)
    next.delete(task.id)
    savingIds.value = next
  }
}

async function schedule(task: Task, plannedDate: string) {
  await patchTask(task, { plannedDate, week: dateToWeek(parseISO(plannedDate)) })
  selected.value = selected.value.filter((id) => id !== task.id)
}

async function scheduleSelected() {
  if (!selected.value.length || !bulkDate.value) return
  const ids = [...selected.value]
  const patch = { plannedDate: bulkDate.value, week: dateToWeek(parseISO(bulkDate.value)) }
  await bulkUpdateTasks(ids, patch)
  tasks.value = tasks.value.map((task) => (ids.includes(task.id) ? { ...task, ...patch } : task))
  selected.value = []
  broadcastSync('tasks')
}

function openTask(task: Task, syncUrl = true) {
  editingTask.value = task
  editorOpen.value = true
  if (syncUrl) void navigateTo({ query: { ...route.query, task: task.id } }, { replace: true })
}

function closeEditor() {
  editorOpen.value = false
  editingTask.value = null
  void navigateTo({ query: { ...route.query, task: undefined } }, { replace: true })
}

function syncTask(task: Task) {
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index !== -1) tasks.value[index] = task
}
</script>

<template>
  <main class="backlog-page app-container">
    <PageHeader
      :title="$t('pages.backlog.title')"
      :description="$t('pages.backlog.description')"
      icon="i-lucide-list-filter"
      :count="source.length"
    >
      <template #actions>
        <AppButton
          to="/capacity"
          variant="secondary"
          icon="i-lucide-gauge"
          >{{ $t('pages.backlog.openCapacity') }}</AppButton
        >
      </template>
    </PageHeader>

    <section class="backlog-page__summary">
      <article>
        <UIcon name="i-lucide-layers-3" /><strong>{{ source.length }}</strong
        ><span>{{ $t('pages.backlog.ready') }}</span>
      </article>
      <article>
        <UIcon name="i-lucide-flame" /><strong>{{ stats.urgent }}</strong
        ><span>{{ $t('pages.backlog.important') }}</span>
      </article>
      <article>
        <UIcon name="i-lucide-hourglass" /><strong>{{ stats.withoutEstimate }}</strong
        ><span>{{ $t('pages.backlog.withoutEstimate') }}</span>
      </article>
      <article>
        <UIcon name="i-lucide-clock-alert" /><strong>{{ stats.stale }}</strong
        ><span>{{ $t('pages.backlog.stale') }}</span>
      </article>
    </section>

    <section class="backlog-page__toolbar surface-card">
      <label class="backlog-page__search">
        <UIcon name="i-lucide-search" />
        <input
          v-model="search"
          :placeholder="$t('pages.backlog.search')"
        />
      </label>
      <FormSelect
        v-model="priority"
        size="sm"
        :aria-label="$t('task.priority')"
      >
        <option value="">{{ $t('pages.backlog.allPriorities') }}</option>
        <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option>
        <option value="high">{{ $t('task.priorityValue.high') }}</option>
        <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
        <option value="low">{{ $t('task.priorityValue.low') }}</option>
      </FormSelect>
      <FormSelect
        v-model="projectId"
        size="sm"
        :aria-label="$t('task.project')"
      >
        <option value="">{{ $t('pages.backlog.allProjects') }}</option>
        <option
          v-for="project in projectsStore.projects"
          :key="project.id"
          :value="project.id"
        >
          {{ project.name }}
        </option>
      </FormSelect>
    </section>

    <section
      v-if="selected.length"
      class="backlog-page__bulk surface-card"
    >
      <strong>{{ $t('pages.backlog.selected', { count: selected.length }) }}</strong>
      <FormInput
        v-model="bulkDate"
        type="date"
        :aria-label="$t('pages.backlog.planDate')"
      />
      <AppButton
        icon="i-lucide-calendar-plus"
        @click="scheduleSelected"
        >{{ $t('pages.backlog.planSelected') }}</AppButton
      >
      <IconButton
        icon="i-lucide-x"
        :label="$t('common.close')"
        @click="selected = []"
      />
    </section>

    <div
      v-if="loading"
      class="backlog-page__loading"
    >
      <USkeleton
        v-for="index in 5"
        :key="index"
        class="h-20 rounded-xl"
      />
    </div>
    <EmptyState
      v-else-if="error"
      :title="$t('pages.backlog.loadError')"
      :description="$t('common.tryAgain')"
      icon="i-lucide-cloud-alert"
    >
      <AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="!visibleTasks.length"
      :title="$t('pages.backlog.empty')"
      :description="$t('pages.backlog.emptyHint')"
      icon="i-lucide-circle-check-big"
    />
    <section
      v-else
      class="backlog-page__list"
    >
      <PlanningTaskRow
        v-for="task in visibleTasks"
        :key="task.id"
        :task="task"
        :project="projectsStore.getProject(task.projectId)"
        selectable
        :selected="selected.includes(task.id)"
        @select="toggleSelected"
        @open="openTask"
      >
        <template #actions>
          <FormSelect
            :model-value="task.estimateMinutes"
            size="sm"
            :aria-label="$t('pages.backlog.estimate')"
            :disabled="savingIds.has(task.id)"
            @update:model-value="patchTask(task, { estimateMinutes: Number($event) || null })"
          >
            <option :value="null">—</option>
            <option
              v-for="minutes in [15, 30, 45, 60, 90, 120]"
              :key="minutes"
              :value="minutes"
            >
              {{ minutes }} {{ $t('task.minuteShort') }}
            </option>
          </FormSelect>
          <IconButton
            icon="i-lucide-sun"
            :label="$t('pages.backlog.today')"
            @click="schedule(task, today)"
          />
          <IconButton
            icon="i-lucide-sunrise"
            :label="$t('pages.backlog.tomorrow')"
            @click="schedule(task, tomorrow)"
          />
          <input
            class="backlog-page__date"
            type="date"
            :aria-label="$t('pages.backlog.planDate')"
            @change="schedule(task, ($event.target as HTMLInputElement).value)"
          />
        </template>
      </PlanningTaskRow>
    </section>

    <TaskEditor
      :open="editorOpen"
      :task="editingTask"
      :projects="projectsStore.projects"
      :assignees="assignees"
      initial-mode="view"
      @close="closeEditor"
      @updated="syncTask"
      @promoted="syncTask"
    />
  </main>
</template>

<style scoped>
.backlog-page__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.backlog-page__summary article {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.1rem 0.65rem;
  padding: 0.8rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.9rem;
  background: var(--color-panel-bg);
}
.backlog-page__summary article > svg {
  grid-row: span 2;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}
.backlog-page__summary strong {
  font-size: 1.15rem;
}
.backlog-page__summary span {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.backlog-page__toolbar,
.backlog-page__bulk {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.8rem;
  padding: 0.55rem;
}
.backlog-page__search {
  display: flex;
  min-width: 14rem;
  flex: 1;
  align-items: center;
  gap: 0.55rem;
  padding-inline: 0.55rem;
  color: var(--color-text-secondary);
}
.backlog-page__search input {
  min-width: 0;
  flex: 1;
  background: transparent;
  color: var(--color-text-primary);
  outline: none;
}
.backlog-page__bulk strong {
  margin-right: auto;
  font-size: 0.8rem;
}
.backlog-page__list,
.backlog-page__loading {
  display: grid;
  gap: 0.55rem;
}
.backlog-page__date {
  width: 2.35rem;
  height: 2.25rem;
  color-scheme: dark;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
  background: var(--color-bg-alt);
  padding: 0.35rem;
  color: transparent;
  cursor: pointer;
}
@media (max-width: 900px) {
  .backlog-page__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .backlog-page__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .backlog-page__search {
    min-width: 0;
    min-height: 2.5rem;
  }
  .backlog-page__bulk {
    align-items: stretch;
    flex-wrap: wrap;
  }
}
</style>
