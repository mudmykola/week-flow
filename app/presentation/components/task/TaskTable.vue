<script setup lang="ts">
import type { AssignableUser, Task, TaskPriority } from '~/domain/entities/task'
import { getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'

defineProps<{ tasks: Task[]; selectedIds: string[]; assignees: AssignableUser[] }>()
const emit = defineEmits<{
  edit: [task: Task]
  select: [id: string, selected: boolean]
  patch: [id: string, patch: Partial<Task>]
}>()
</script>

<template>
  <div class="task-table surface-card overflow-x-auto p-0">
    <table class="w-full min-w-[780px] text-left text-sm">
      <thead class="text-secondary border-b border-[var(--color-panel-border)] text-xs">
        <tr>
          <th class="w-10 p-3"></th>
          <th class="p-3">{{ $t('task.title') }}</th>
          <th class="p-3">{{ $t('task.status') }}</th>
          <th class="p-3">{{ $t('task.priority') }}</th>
          <th class="p-3">{{ $t('task.assignee') }}</th>
          <th class="p-3">{{ $t('task.deadline') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--color-panel-border)]">
        <tr
          v-for="task in tasks"
          :key="task.id"
          class="hover:bg-[var(--color-bg-alt)]"
        >
          <td class="p-3">
            <input
              :checked="selectedIds.includes(task.id)"
              type="checkbox"
              class="accent-[var(--color-accent)]"
              @change="emit('select', task.id, ($event.target as HTMLInputElement).checked)"
            />
          </td>
          <td class="max-w-sm p-3">
            <button
              class="w-full truncate text-left font-semibold hover:text-[var(--color-accent)]"
              @click="emit('edit', task)"
            >
              {{ task.title }}
            </button>
          </td>
          <td class="p-3">
            <select
              :value="task.status"
              class="rounded-lg bg-transparent p-1"
              @change="emit('patch', task.id, { status: ($event.target as HTMLSelectElement).value as Task['status'] })"
            >
              <option
                v-for="status in TASK_STATUSES"
                :key="status"
                :value="status"
              >
                {{ $t(getStatusLabel(status)) }}
              </option>
            </select>
          </td>
          <td class="p-3">
            <select
              :value="task.priority"
              class="rounded-lg bg-transparent p-1"
              @change="emit('patch', task.id, { priority: ($event.target as HTMLSelectElement).value as TaskPriority })"
            >
              <option value="low">{{ $t('task.priorityValue.low') }}</option>
              <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
              <option value="high">{{ $t('task.priorityValue.high') }}</option>
              <option value="urgent">{{ $t('task.priorityValue.urgent') }}</option>
            </select>
          </td>
          <td class="p-3">
            <select
              :value="task.assigneeId"
              class="max-w-44 rounded-lg bg-transparent p-1"
              @change="emit('patch', task.id, { assigneeId: ($event.target as HTMLSelectElement).value || null })"
            >
              <option value="">{{ $t('task.unassigned') }}</option>
              <option
                v-for="person in assignees"
                :key="person.id"
                :value="person.id"
              >
                {{ person.name }}
              </option>
            </select>
          </td>
          <td class="p-3">
            <input
              :value="task.dueDate ?? ''"
              type="date"
              class="bg-transparent"
              @change="emit('patch', task.id, { dueDate: ($event.target as HTMLInputElement).value || null })"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
