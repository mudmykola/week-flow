<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'
import { getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'

const props = defineProps<{
  tasksByStatus: Record<Task['status'], Task[]>
  getProject: (id: string | null) => Project | null
  selectedIds?: string[]
  getAssigneeName?: (id: string | null) => string
  projects: Project[]
  assignees: import('~/domain/entities/task').AssignableUser[]
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  cycleStatus: [task: Task]
  addTask: [status: Task['status']]
  reorder: [status: Task['status'], tasks: Task[]]
  select: [id: string, selected: boolean]
  duplicate: [id: string]
  inlineTitle: [id: string, title: string]
  quickCreate: [
    payload: {
      title: string
      status: Task['status']
      projectId: string | null
      assigneeId: string | null
      dueDate: string | null
      priority: Task['priority']
    }
  ]
}>()
const { t } = useI18n()

const columns = computed(() => TASK_STATUSES.map((status) => ({ status, title: t(getStatusLabel(status)) })))
const density = useLocalStorage<'comfortable' | 'compact'>('weekflow-board-density', 'comfortable')
const collapsedDone = useLocalStorage('weekflow-board-done-collapsed', false)
const quickStatus = ref<Task['status'] | null>(null)

const localLists = reactive<Record<Task['status'], Task[]>>({
  todo: [...props.tasksByStatus.todo],
  in_progress: [...props.tasksByStatus.in_progress],
  done: [...props.tasksByStatus.done]
})

watch(
  () => props.tasksByStatus,
  (value) => {
    for (const status of TASK_STATUSES) {
      localLists[status] = [...value[status]]
    }
  },
  { deep: true }
)

function handleChange(status: Task['status']) {
  emit('reorder', status, localLists[status])
}

function forwardSelect(id: string, selected: boolean) {
  emit('select', id, selected)
}
function forwardInlineTitle(id: string, title: string) {
  emit('inlineTitle', id, title)
}
function openQuick(status: Task['status']) {
  quickStatus.value = quickStatus.value === status ? null : status
}
</script>

<template>
  <div class="week-board">
    <WeekBoardToolbar
      v-model:density="density"
      v-model:collapsed-done="collapsedDone"
    />
    <div
      class="app-scrollbar flex snap-x overflow-x-auto pb-2"
      :class="density === 'compact' ? 'gap-2' : 'gap-3'"
      :data-density="density"
    >
      <section
        v-for="column in columns"
        v-show="column.status !== 'done' || !collapsedDone"
        :key="column.status"
        class="board-column flex w-[86vw] max-w-[25rem] shrink-0 snap-start flex-col sm:w-[22rem] xl:min-w-[18rem] xl:flex-1"
        :class="density === 'compact' ? 'p-1.5' : 'p-2.5'"
      >
        <div class="mb-2 flex items-center justify-between px-1 py-1">
          <h2 class="font-display flex items-center gap-2 text-base">
            <span
              class="size-2 rounded-full"
              :data-status="column.status"
            />{{ column.title }}
            <span class="count-badge">{{ localLists[column.status].length }}</span>
          </h2>
          <button
            type="button"
            class="text-secondary grid size-8 place-items-center rounded-lg hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
            :title="$t('board.addTask')"
            :aria-label="$t('board.addTaskTo', { column: column.title })"
            @click="openQuick(column.status)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
          </button>
        </div>

        <p
          v-if="column.status === 'in_progress' && localLists.in_progress.length > 5"
          class="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          {{ $t('board.wipExceeded') }}
        </p>

        <draggable
          v-model="localLists[column.status]"
          :group="{ name: 'tasks' }"
          :force-fallback="true"
          :fallback-tolerance="4"
          item-key="id"
          class="flex min-h-[3rem] flex-1 flex-col"
          :class="density === 'compact' ? 'gap-1.5' : 'gap-2.5'"
          ghost-class="opacity-30"
          drag-class="cursor-grabbing"
          @change="handleChange(column.status)"
        >
          <template #item="{ element: task }">
            <TaskCard
              :task="task"
              :project="getProject(task.projectId)"
              :compact="density === 'compact'"
              :selected="selectedIds?.includes(task.id)"
              :assignee-name="getAssigneeName?.(task.assigneeId)"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @cycle-status="emit('cycleStatus', $event)"
              @select="forwardSelect"
              @duplicate="emit('duplicate', $event)"
              @inline-title="forwardInlineTitle"
            />
          </template>
        </draggable>
        <TaskQuickCreate
          v-if="quickStatus === column.status"
          class="mt-2"
          :status="column.status"
          :projects="projects"
          :assignees="assignees"
          @create="emit('quickCreate', $event)"
          @full="emit('addTask', $event)"
          @close="quickStatus = null"
        />
        <div
          v-if="localLists[column.status].length === 0"
          class="grid place-items-center px-3 py-3 text-center"
        >
          <div>
            <UIcon
              :name="column.status === 'done' ? 'i-lucide-circle-check-big' : 'i-lucide-inbox'"
              class="text-secondary mx-auto mb-1.5 size-4"
            />
            <p class="text-xs font-semibold">{{ $t('board.empty') }}</p>
            <p class="text-secondary mt-0.5 text-[11px]">{{ $t('board.emptyHint') }}</p>
          </div>
        </div>
        <button
          class="text-secondary mt-2 flex h-9 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-panel-border)] text-xs font-semibold hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
          :aria-label="$t('board.addTaskTo', { column: column.title })"
          @click="openQuick(column.status)"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4"
          />{{ $t('board.addTask') }}
        </button>
      </section>
      <button
        v-if="collapsedDone"
        class="board-column text-secondary grid min-h-36 w-12 shrink-0 place-items-center"
        :title="$t('board.showDone')"
        @click="collapsedDone = false"
      >
        <span class="flex -rotate-90 items-center gap-2 whitespace-nowrap"
          ><UIcon name="i-lucide-circle-check-big" />{{ $t('common.done') }} · {{ localLists.done.length }}</span
        >
      </button>
    </div>
  </div>
</template>
