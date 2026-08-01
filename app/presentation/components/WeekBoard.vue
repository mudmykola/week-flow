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
</script>

<template>
  <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
    <div v-for="column in columns" :key="column.status" class="glass-panel flex flex-col p-5">
      <div class="mb-4 flex items-center justify-between px-1">
        <h3 class="font-display text-xl">
          {{ column.title }}
          <span class="ml-1.5 text-secondary">{{ localLists[column.status].length }}</span>
        </h3>
        <button
          type="button"
          class="text-xl text-secondary hover:text-black"
          title="Додати задачу"
          @click="emit('addTask', column.status)"
        >
          +
        </button>
      </div>

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
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
            @cycle-status="emit('cycleStatus', $event)"
          />
        </template>
      </draggable>
      <p v-if="localLists[column.status].length === 0" class="px-1 py-3 text-sm text-secondary">
        Немає задач
      </p>
    </div>
  </div>
</template>
