<script setup lang="ts">
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import type { Task } from '~/domain/entities/task'
import { calendarMinutes } from '~/domain/services/calendar'
import { priorityColors } from '~/domain/services/taskLabels'

defineProps<{
  weekDays: Date[]
  today: string
  dateLocale: Locale
  hours: number[]
  tasksByDate: Partial<Record<string, Task[]>>
  conflicts: Set<string>
}>()
const emit = defineEmits<{
  select: [date: string]
  create: [date: string, time: string]
  drag: [task: Task]
  drop: [date: string, time: string]
  open: [task: Task]
}>()
</script>

<template>
  <section class="calendar-week-view calendar-week surface-card">
    <div
      v-for="day in weekDays"
      :key="day.toISOString()"
      class="calendar-week__day"
      :class="{ 'is-today': format(day, 'yyyy-MM-dd') === today }"
    >
      <header @click="emit('select', format(day, 'yyyy-MM-dd'))">
        <strong>{{ format(day, 'EEE', { locale: dateLocale }) }}</strong
        ><span>{{ format(day, 'd') }}</span
        ><small
          >{{ Math.round((calendarMinutes(tasksByDate[format(day, 'yyyy-MM-dd')] || []) / 60) * 10) / 10 }}h</small
        >
      </header>
      <button
        v-for="hour in hours"
        :key="hour"
        class="calendar-slot"
        @dblclick="emit('create', format(day, 'yyyy-MM-dd'), `${String(hour).padStart(2, '0')}:00`)"
        @dragover.prevent
        @drop="emit('drop', format(day, 'yyyy-MM-dd'), `${String(hour).padStart(2, '0')}:00`)"
      >
        <span>{{ hour }}:00</span>
      </button>
      <button
        v-for="task in (tasksByDate[format(day, 'yyyy-MM-dd')] || []).filter((item) => item.plannedTime)"
        :key="task.id"
        draggable="true"
        class="calendar-week__task"
        :class="{ 'is-conflict': conflicts.has(task.id) }"
        :style="{
          top: `${3.4 + Math.max(0, Number(task.plannedTime!.slice(0, 2)) - 8) * 2.75}rem`,
          borderColor: priorityColors[task.priority]
        }"
        @dragstart="emit('drag', task)"
        @click="emit('open', task)"
      >
        <strong>{{ task.plannedTime }} · {{ task.title }}</strong
        ><small>{{ $t('task.minutes', { count: task.estimateMinutes || 30 }) }}</small>
      </button>
    </div>
  </section>
</template>
