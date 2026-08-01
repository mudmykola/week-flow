<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'
import { getStatusLabel } from '~/domain/services/taskStatus'

const props = defineProps<{
  task: Task
  project: Project | null
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  cycleStatus: [task: Task]
}>()

const statusDotColor: Record<Task['status'], string> = {
  todo: 'var(--color-status-todo)',
  in_progress: 'var(--color-status-in-progress)',
  done: 'var(--color-status-done)'
}
const priorityColor: Record<Task['priority'], string> = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' }
</script>

<template>
  <div
    class="glass-card group relative cursor-pointer p-4"
    :class="{ 'task-done': task.status === 'done' }"
    @click="emit('edit', task)"
  >
    <div class="flex items-start gap-3">
      <button
        type="button"
        class="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
        :style="{ backgroundColor: statusDotColor[task.status] }"
        :title="getStatusLabel(task.status)"
        @click.stop="emit('cycleStatus', task)"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2"><span class="size-2 rounded-full" :style="{backgroundColor:priorityColor[task.priority ?? 'medium']}"/><p class="truncate text-base font-medium">{{ task.title }}</p></div>
        <p v-if="task.note" class="mt-1 truncate text-sm text-secondary">{{ task.note }}</p>
        <ProjectBadge v-if="project" :project="project" class="mt-2.5" />
        <div v-if="task.dueDate || task.recurrence || task.tags?.length" class="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-secondary"><span v-if="task.dueDate" class="inline-flex items-center gap-1"><UIcon name="i-lucide-calendar"/>{{ task.dueDate }}</span><UIcon v-if="task.recurrence" name="i-lucide-repeat-2"/><span v-for="tag in task.tags" :key="tag">#{{ tag }}</span></div>
      </div>
      <button
        type="button"
        class="text-lg text-secondary opacity-0 transition-opacity hover:text-black group-hover:opacity-100"
        title="Видалити"
        @click.stop="emit('delete', task.id)"
      >
        <UIcon name="i-lucide-trash-2" class="size-4" />
      </button>
    </div>
  </div>
</template>
