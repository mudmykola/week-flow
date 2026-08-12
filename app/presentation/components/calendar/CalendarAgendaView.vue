<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import type { Locale } from 'date-fns'
import type { AssignableUser, Task } from '~/domain/entities/task'
import { calendarMinutes } from '~/domain/services/calendar'
import { priorityColors } from '~/domain/services/taskLabels'

const props = defineProps<{
  agendaDays: string[]
  tasksByDate: Partial<Record<string, Task[]>>
  assignees: AssignableUser[]
  dateLocale: Locale
}>()
const emit = defineEmits<{ select: [date: string]; open: [task: Task]; drag: [task: Task] }>()
const projectsStore = useProjectsStore()

function dateLabel(date: string, pattern = 'EEEE, d MMMM') {
  return format(parseISO(date), pattern, { locale: props.dateLocale })
}
function sortByTime(left: Task, right: Task) {
  return (left.plannedTime || '99:99').localeCompare(right.plannedTime || '99:99')
}
function project(task: Task) {
  return projectsStore.getProject(task.projectId)
}
function assignee(task: Task) {
  return props.assignees.find((person) => person.id === task.assigneeId)
}
</script>

<template>
  <section class="calendar-agenda-view calendar-agenda surface-card">
    <article
      v-for="date in agendaDays"
      :key="date"
      class="calendar-agenda__day"
    >
      <header @click="emit('select', date)">
        <strong>{{ dateLabel(date, 'd') }}</strong
        ><span>{{ dateLabel(date) }}</span
        ><small>{{ $t('task.minutes', { count: calendarMinutes(tasksByDate[date] || []) }) }}</small>
      </header>
      <button
        v-for="task in (tasksByDate[date] || []).slice().sort(sortByTime)"
        :key="task.id"
        draggable="true"
        class="calendar-agenda__task"
        @dragstart="emit('drag', task)"
        @click="emit('open', task)"
      >
        <span class="calendar-agenda__time">{{ task.plannedTime || '—' }}</span
        ><i :style="{ background: priorityColors[task.priority] }" /><span
          ><strong>{{ task.title }}</strong
          ><small
            >{{ project(task)?.name || $t('task.noProject') }} ·
            {{ assignee(task)?.name || $t('task.unassigned') }}</small
          ></span
        ><UIcon name="i-lucide-chevron-right" />
      </button>
    </article>
    <EmptyState
      v-if="!agendaDays.length"
      :title="$t('pages.calendar.emptyAgenda')"
      :description="$t('pages.calendar.emptyAgendaHint')"
      icon="i-lucide-calendar-x"
    />
  </section>
</template>
