<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'
import { getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'

const props = defineProps<{
  tasksByStatus: Record<Task['status'], Task[]>
  getProject: (id: string | null) => Project | null
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  cycleStatus: [task: Task]
  addTask: [status: Task['status']]
  reorder: [status: Task['status'], tasks: Task[]]
}>()

const columns = TASK_STATUSES.map(status => ({ status, title: getStatusLabel(status) }))
const density = useLocalStorage<'comfortable' | 'compact'>('weekflow-board-density', 'comfortable')
const collapsedDone = useLocalStorage('weekflow-board-done-collapsed', false)

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

function toggleDensity() {
  density.value = density.value === 'comfortable' ? 'compact' : 'comfortable'
}
</script>

<template>
  <div>
    <div class="mb-3 flex justify-end gap-2">
      <button class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-xs text-secondary" @click="toggleDensity"><UIcon :name="density === 'comfortable' ? 'i-lucide-rows-3' : 'i-lucide-rows-4'" />{{ density === 'comfortable' ? 'Компактно' : 'Зручно' }}</button>
      <button class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-xs text-secondary" @click="collapsedDone = !collapsedDone"><UIcon :name="collapsedDone ? 'i-lucide-panel-right-open' : 'i-lucide-panel-right-close'" />{{ collapsedDone ? 'Показати готові' : 'Згорнути готові' }}</button>
    </div>
    <div class="app-scrollbar flex snap-x gap-4 overflow-x-auto pb-3">
    <div v-for="column in columns" v-show="column.status !== 'done' || !collapsedDone" :key="column.status" class="surface-card flex min-h-[26rem] w-[86vw] max-w-[25rem] shrink-0 snap-start flex-col p-4 sm:w-[22rem] xl:min-w-[19rem] xl:flex-1">
      <div class="sticky top-16 z-10 mb-4 flex items-center justify-between bg-[var(--color-panel-bg)] px-1 py-1">
        <h3 class="font-display text-xl">
          {{ column.title }}
          <span class="ml-1.5 text-secondary">{{ localLists[column.status].length }}</span>
        </h3>
        <button
          type="button"
          class="text-xl text-secondary hover:text-black"
          title="Додати задачу"
          :aria-label="`Додати задачу у ${column.title}`"
          @click="emit('addTask', column.status)"
        >
          +
        </button>
      </div>

      <p v-if="column.status === 'in_progress' && localLists.in_progress.length > 5" class="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">WIP limit перевищено: рекомендовано не більше 5 активних задач.</p>

      <draggable
        v-model="localLists[column.status]"
        :group="{ name: 'tasks' }"
        :force-fallback="true"
        :fallback-tolerance="4"
        item-key="id"
        class="flex min-h-[3rem] flex-1 flex-col gap-3"
        ghost-class="opacity-30"
        drag-class="cursor-grabbing"
        @change="handleChange(column.status)"
      >
        <template #item="{ element: task }">
          <TaskCard
            :task="task"
            :project="getProject(task.projectId)"
            :compact="density === 'compact'"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
            @cycle-status="emit('cycleStatus', $event)"
          />
        </template>
      </draggable>
      <p v-if="localLists[column.status].length === 0" class="px-1 py-3 text-sm text-secondary">
        Немає задач
      </p>
      <button class="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-panel-border)] px-3 py-2.5 text-sm text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]" :aria-label="`Додати задачу у ${column.title}`" @click="emit('addTask', column.status)"><UIcon name="i-lucide-plus" />Додати задачу</button>
    </div>
    <button v-if="collapsedDone" class="surface-card grid min-h-[26rem] w-16 shrink-0 place-items-center text-secondary" title="Показати готові" @click="collapsedDone = false"><span class="flex -rotate-90 items-center gap-2 whitespace-nowrap"><UIcon name="i-lucide-circle-check-big" />Готово · {{ localLists.done.length }}</span></button>
    </div>
  </div>
</template>
