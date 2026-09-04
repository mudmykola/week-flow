<script setup lang="ts">
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'

defineProps<{ task: Task; project?: Project | null; selected?: boolean; selectable?: boolean }>()
const emit = defineEmits<{ open: [task: Task]; select: [id: string, selected: boolean] }>()
</script>

<template>
  <article
    class="planning-task-row"
    tabindex="0"
    @click="emit('open', task)"
    @keydown.enter="emit('open', task)"
  >
    <input
      v-if="selectable"
      type="checkbox"
      :checked="selected"
      :aria-label="$t('taskActions.select')"
      @click.stop
      @change="emit('select', task.id, ($event.target as HTMLInputElement).checked)"
    />
    <span
      class="planning-task-row__priority"
      :data-priority="task.priority"
    />
    <div class="planning-task-row__body">
      <strong>{{ task.title }}</strong>
      <div class="planning-task-row__meta">
        <ProjectBadge
          v-if="project"
          :project="project"
        />
        <span v-if="task.dueDate"><UIcon name="i-lucide-calendar-clock" />{{ task.dueDate }}</span>
        <span :class="{ 'planning-task-row__missing': !task.estimateMinutes }">
          <UIcon name="i-lucide-hourglass" />
          {{ task.estimateMinutes ? $t('task.minutes', { count: task.estimateMinutes }) : $t('planning.noEstimate') }}
        </span>
      </div>
    </div>
    <div
      class="planning-task-row__actions"
      @click.stop
    >
      <slot name="actions" />
    </div>
  </article>
</template>

<style scoped>
.planning-task-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--color-panel-bg) 88%, transparent);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease;
}
.planning-task-row:hover,
.planning-task-row:focus-visible {
  border-color: color-mix(in srgb, var(--color-accent) 22%, var(--color-panel-border));
  background: color-mix(in srgb, var(--color-panel-bg) 94%, var(--color-accent) 6%);
  outline: none;
}
.planning-task-row__priority {
  width: 0.25rem;
  align-self: stretch;
  border-radius: 999px;
  background: var(--color-neutral);
}
.planning-task-row__priority[data-priority='urgent'] {
  background: var(--color-danger);
}
.planning-task-row__priority[data-priority='high'] {
  background: var(--color-accent);
}
.planning-task-row__priority[data-priority='medium'] {
  background: var(--color-warning);
}
.planning-task-row__priority[data-priority='low'] {
  background: var(--color-info);
}
.planning-task-row__body {
  min-width: 0;
  flex: 1;
}
.planning-task-row__body > strong {
  display: block;
  overflow: hidden;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.planning-task-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.35rem;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.planning-task-row__meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.planning-task-row__missing {
  color: var(--color-warning);
}
.planning-task-row__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
}
@media (max-width: 640px) {
  .planning-task-row {
    align-items: flex-start;
  }
  .planning-task-row__actions {
    max-width: 48%;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
