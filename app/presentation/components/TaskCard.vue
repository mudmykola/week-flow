<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'
import { getStatusLabel } from '~/domain/services/taskStatus'

const props = defineProps<{
  task: Task
  project: Project | null
  compact?: boolean
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
  <article
    class="task-card group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    :class="[{ 'task-done': task.status === 'done' }, compact ? 'p-2.5' : 'p-3']"
    role="button"
    tabindex="0"
    @click="emit('edit', task)"
    @keydown.enter="emit('edit', task)"
    @keydown.space.prevent="emit('edit', task)"
  >
    <div class="flex items-start gap-3">
      <button
        type="button"
        class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--color-panel-border)]"
        :style="{ backgroundColor: statusDotColor[task.status] }"
        :title="getStatusLabel(task.status)"
        @click.stop="emit('cycleStatus', task)"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2"><span class="h-4 w-1 shrink-0 rounded-full" :style="{backgroundColor:priorityColor[task.priority ?? 'medium']}"/><p class="truncate text-sm font-semibold">{{ task.title }}</p></div>
        <p v-if="task.note && !compact" class="mt-1 truncate text-sm text-secondary">{{ task.note }}</p>
        <ProjectBadge v-if="project" :project="project" class="mt-2.5" />
        <div v-if="task.dueDate || (!compact && (task.recurrence || task.tags?.length))" class="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-secondary"><span v-if="task.dueDate" class="inline-flex items-center gap-1"><UIcon name="i-lucide-calendar"/>{{ task.dueDate }}</span><UIcon v-if="task.recurrence && !compact" name="i-lucide-repeat-2"/><span v-for="tag in compact ? [] : task.tags" :key="tag">#{{ tag }}</span></div>
      </div>
      <button
        type="button"
        class="grid size-7 place-items-center rounded-lg text-secondary opacity-0 transition-opacity hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-danger)] focus:opacity-100 group-hover:opacity-100"
        title="Видалити"
        @click.stop="emit('delete', task.id)"
      >
        <UIcon name="i-lucide-trash-2" class="size-4" />
      </button>
    </div>
  </article>
</template>
