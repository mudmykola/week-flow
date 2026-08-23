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

<style scoped>
.today-task-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 3.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.8rem;
  background: var(--color-panel-bg);
  transition:
    border-color 0.15s,
    transform 0.15s;
}
.today-task-row:hover {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-panel-border));
  transform: translateY(-1px);
}
.today-task-row__select {
  accent-color: var(--color-accent);
  opacity: 0;
  transition: opacity 0.15s;
}
.today-task-row:hover .today-task-row__select,
.today-task-row__select:checked,
.today-task-row__select:focus-visible {
  opacity: 1;
}
.today-task-row__check {
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}
.today-task-row__content {
  min-width: 0;
  text-align: left;
}
.today-task-row__title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 650;
}
.today-task-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.2rem;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.today-task-row__meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.today-task-row__overdue {
  color: var(--color-danger);
}
.today-task-row__time {
  width: 6.1rem;
  padding: 0.35rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  font-size: 0.75rem;
}
.today-task-row__menu {
  position: relative;
}
.today-task-row__menu summary {
  display: grid;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  list-style: none;
  place-items: center;
  border-radius: 0.5rem;
  color: var(--color-text-secondary);
}
.today-task-row__menu summary:hover {
  background: var(--color-bg-alt);
  color: var(--color-text-primary);
}
.today-task-row__menu > div {
  position: absolute;
  top: 2.2rem;
  right: 0;
  z-index: 20;
  width: 11rem;
  padding: 0.3rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.65rem;
  background: var(--color-panel-bg);
  box-shadow: 0 12px 30px rgb(0 0 0 / 0.22);
}
.today-task-row__menu:not([open]) > div {
  display: none;
}
.today-task-row__menu button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  text-align: left;
}
.today-task-row__menu button:hover {
  background: var(--color-bg-alt);
}
.today-task-row--done {
  opacity: 0.62;
}
.today-task-row--done .today-task-row__title {
  text-decoration: line-through;
}
@media (max-width: 640px) {
  .today-task-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .today-task-row__select,
  .today-task-row__time {
    display: none;
  }
}
</style>
