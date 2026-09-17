<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { AssignableUser, Task, TaskPriority, UpdateTaskInput } from '~/domain/entities/task'

const props = defineProps<{
  selectedIds: string[]
  tasks: Task[]
  assignees: AssignableUser[]
  projects: Project[]
  week: string
}>()
const emit = defineEmits<{ patch: [patch: UpdateTaskInput]; clear: [] }>()
const availableBlockers = computed(() => props.tasks.filter((task) => !props.selectedIds.includes(task.id)))
</script>

<template>
  <div
    class="week-bulk-actions fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-2 shadow-2xl"
  >
    <strong class="px-2 text-sm">{{ selectedIds.length }} {{ $t('board.selected') }}</strong>
    <button
      class="rounded-lg px-3 py-2 text-xs hover:bg-[var(--color-bg-alt)]"
      @click="emit('patch', { status: 'done' })"
    >
      {{ $t('board.complete') }}
    </button>
    <select
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('task.priority')"
      @change="emit('patch', { priority: ($event.target as HTMLSelectElement).value as TaskPriority })"
    >
      <option value="">{{ $t('task.priority') }}</option>
      <option
        v-for="priority in ['urgent', 'high', 'medium', 'low'] as const"
        :key="priority"
        :value="priority"
      >
        {{ $t(`task.priorityValue.${priority}`) }}
      </option>
    </select>
    <select
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('board.assign')"
      @change="emit('patch', { assigneeId: ($event.target as HTMLSelectElement).value || null })"
    >
      <option value="">{{ $t('board.assign') }}</option>
      <option
        v-for="person in assignees"
        :key="person.id"
        :value="person.id"
      >
        {{ person.name }}
      </option>
    </select>
    <select
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('task.project')"
      @change="emit('patch', { projectId: ($event.target as HTMLSelectElement).value || null })"
    >
      <option value="">{{ $t('board.changeProject') }}</option>
      <option
        v-for="project in projects"
        :key="project.id"
        :value="project.id"
      >
        {{ project.name }}
      </option>
    </select>
    <input
      type="date"
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('task.plannedDate')"
      @change="emit('patch', { plannedDate: ($event.target as HTMLInputElement).value || null })"
    />
    <select
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('board.blockedBy')"
      @change="emit('patch', { blockedByTaskId: ($event.target as HTMLSelectElement).value || null })"
    >
      <option value="">{{ $t('board.blockedBy') }}</option>
      <option
        v-for="task in availableBlockers"
        :key="task.id"
        :value="task.id"
      >
        {{ task.title }}
      </option>
    </select>
    <input
      type="date"
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('task.deadline')"
      @change="emit('patch', { dueDate: ($event.target as HTMLInputElement).value || null })"
    />
    <input
      :value="week"
      type="week"
      class="rounded-lg bg-[var(--color-bg-alt)] px-2 py-2 text-xs"
      :aria-label="$t('board.moveWeek')"
      @change="emit('patch', { week: ($event.target as HTMLInputElement).value })"
    />
    <button
      class="rounded-lg px-3 py-2 text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg-alt)]"
      @click="emit('patch', { archivedAt: Date.now() })"
    >
      {{ $t('common.archive') }}
    </button>
    <IconButton
      icon="i-lucide-x"
      :label="$t('common.close')"
      size="sm"
      variant="ghost"
      @click="emit('clear')"
    />
  </div>
</template>
