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

<style scoped src="~/presentation/assets/css/components/planning/planning-task-row.css"></style>
