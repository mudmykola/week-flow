<script setup lang="ts">
import type { Task } from '~/domain/entities/task'

const props = defineProps<{ task: Task; selected: boolean; projectName?: string; assigneeName?: string }>()
const emit = defineEmits<{
  select: [value: boolean]
  toggle: []
  edit: []
  patch: [patch: Partial<Task>]
  focus: []
}>()
</script>

<template>
  <article
    class="today-task-row"
    :class="{ 'today-task-row--done': task.status === 'done' }"
    @dblclick="emit('edit')"
  >
    <input
      type="checkbox"
      class="today-task-row__select"
      :checked="selected"
      :aria-label="$t('pages.today.selectTask', { title: task.title })"
      @change="emit('select', ($event.target as HTMLInputElement).checked)"
    />
    <button
      class="today-task-row__check"
      type="button"
      :aria-label="$t('taskActions.complete')"
      @click="emit('toggle')"
    >
      <UIcon :name="task.status === 'done' ? 'i-lucide-circle-check-big' : 'i-lucide-circle'" />
    </button>
    <button
      class="today-task-row__content"
      type="button"
      @click="emit('edit')"
    >
      <span class="today-task-row__title">{{ task.title }}</span>
      <span class="today-task-row__meta">
        <span v-if="projectName"><UIcon name="i-lucide-folder" />{{ projectName }}</span>
        <span v-if="assigneeName"><UIcon name="i-lucide-user" />{{ assigneeName }}</span>
        <span
          v-if="task.dueDate"
          :class="{ 'today-task-row__overdue': task.dueDate < task.plannedDate! && task.status !== 'done' }"
        >
          <UIcon name="i-lucide-calendar" />{{ task.dueDate }}
        </span>
        <span v-if="task.estimateMinutes"><UIcon name="i-lucide-hourglass" />{{ task.estimateMinutes }}m</span>
        <span v-if="task.subtaskCount"
          ><UIcon name="i-lucide-list-checks" />{{ task.completedSubtaskCount || 0 }}/{{ task.subtaskCount }}</span
        >
      </span>
    </button>
    <input
      class="today-task-row__time"
      type="time"
      :value="task.plannedTime || ''"
      :aria-label="$t('task.plannedTime')"
      @change="emit('patch', { plannedTime: ($event.target as HTMLInputElement).value || null })"
    />
    <details class="today-task-row__menu">
      <summary :aria-label="$t('pages.today.taskMenu')"><UIcon name="i-lucide-ellipsis" /></summary>
      <div>
        <button
          type="button"
          @click="emit('focus')"
        >
          <UIcon name="i-lucide-timer" />{{ $t('pages.today.startFocus') }}
        </button>
        <button
          type="button"
          @click="emit('patch', { dayRank: task.dayRank ? null : 1 })"
        >
          <UIcon :name="task.dayRank ? 'i-lucide-star-off' : 'i-lucide-star'" />{{ $t('pages.today.sections.top') }}
        </button>
        <button
          type="button"
          @click="emit('edit')"
        >
          <UIcon name="i-lucide-pencil" />{{ $t('common.edit') }}
        </button>
      </div>
    </details>
  </article>
</template>

<style scoped src="~/presentation/assets/css/components/today/today-task-row.css"></style>
