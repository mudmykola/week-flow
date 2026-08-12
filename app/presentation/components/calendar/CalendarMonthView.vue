<script setup lang="ts">
import { format, isSameMonth } from 'date-fns'
import type { Task } from '~/domain/entities/task'
import { priorityColors } from '~/domain/services/taskLabels'

defineProps<{
  weekdays: string[]
  monthDates: Date[]
  cursor: Date
  selectedDate: string
  today: string
  tasksByDate: Partial<Record<string, Task[]>>
  conflicts: Set<string>
}>()
const emit = defineEmits<{
  select: [date: string]
  create: [date: string]
  drag: [task: Task]
  drop: [date: string]
  open: [task: Task]
}>()
</script>

<template>
  <section class="calendar-month-view calendar-month surface-card">
    <div class="calendar-month__weekdays">
      <div
        v-for="day in weekdays"
        :key="day"
      >
        {{ day }}
      </div>
    </div>
    <div class="calendar-month__grid">
      <div
        v-for="date in monthDates"
        :key="date.toISOString()"
        class="calendar-day"
        :class="{
          'calendar-day--outside': !isSameMonth(date, cursor),
          'calendar-day--selected': format(date, 'yyyy-MM-dd') === selectedDate,
          'calendar-day--today': format(date, 'yyyy-MM-dd') === today
        }"
        role="button"
        tabindex="0"
        @click="emit('select', format(date, 'yyyy-MM-dd'))"
        @dblclick="emit('create', format(date, 'yyyy-MM-dd'))"
        @dragover.prevent
        @drop.stop="emit('drop', format(date, 'yyyy-MM-dd'))"
      >
        <span class="calendar-day__number">{{ format(date, 'd') }}</span>
        <div class="calendar-day__tasks">
          <button
            v-for="task in (tasksByDate[format(date, 'yyyy-MM-dd')] || []).slice(0, 4)"
            :key="task.id"
            draggable="true"
            class="calendar-task-chip"
            :class="{ 'is-conflict': conflicts.has(task.id), 'is-done': task.status === 'done' }"
            @dragstart.stop="emit('drag', task)"
            @click.stop="emit('open', task)"
          >
            <i :style="{ background: priorityColors[task.priority] }" /><span
              >{{ task.plannedTime || '' }} {{ task.title }}</span
            >
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
