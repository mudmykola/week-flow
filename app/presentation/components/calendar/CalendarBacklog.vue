<script setup lang="ts">
import type { Task } from '~/domain/entities/task'
import { priorityColors } from '~/domain/services/taskLabels'

defineProps<{ tasks: Task[] }>()
const emit = defineEmits<{ drag: [task: Task]; drop: []; open: [task: Task] }>()
</script>

<template>
  <aside
    class="calendar-backlog surface-card"
    @dragover.prevent
    @drop="emit('drop')"
  >
    <header>
      <div>
        <strong>{{ $t('pages.calendar.unscheduled') }}</strong
        ><small>{{ $t('pages.calendar.dragHint') }}</small>
      </div>
      <span>{{ tasks.length }}</span>
    </header>
    <div class="calendar-backlog__list">
      <button
        v-for="task in tasks"
        :key="task.id"
        draggable="true"
        class="calendar-task"
        @dragstart="emit('drag', task)"
        @click="emit('open', task)"
      >
        <i :style="{ background: priorityColors[task.priority] }" /><span
          ><strong>{{ task.title }}</strong
          ><small>{{
            task.dueDate ? $t('pages.calendar.due', { date: task.dueDate }) : $t('pages.calendar.noDate')
          }}</small></span
        >
      </button>
    </div>
  </aside>
</template>
