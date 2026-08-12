<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import type { Locale } from 'date-fns'
import type { Task } from '~/domain/entities/task'

const props = defineProps<{
  selectedDate: string
  dateLocale: Locale
  saving: boolean
  selectedMinutes: number
  selectedPercent: number
  selectedConflicts: Set<string>
  selectedTasks: Task[]
}>()
const emit = defineEmits<{ 'create-new': []; 'quick-create': []; open: [task: Task]; 'set-top': [task: Task] }>()
const quickTitle = defineModel<string>('quickTitle', { required: true })

function dateLabel(date: string, pattern = 'EEEE, d MMMM') {
  return format(parseISO(date), pattern, { locale: props.dateLocale })
}
</script>

<template>
  <aside class="calendar-day-panel surface-card">
    <header>
      <div>
        <strong>{{ dateLabel(selectedDate, 'd MMMM') }}</strong
        ><small>{{ dateLabel(selectedDate, 'EEEE') }}</small>
      </div>
      <IconButton
        icon="i-lucide-plus"
        :label="$t('shell.newTask')"
        @click="emit('create-new')"
      />
    </header>
    <form
      class="calendar-day-panel__quick"
      @submit.prevent="emit('quick-create')"
    >
      <input
        v-model="quickTitle"
        :placeholder="$t('pages.calendar.quickPlaceholder')"
        :disabled="saving"
      />
      <IconButton
        icon="i-lucide-corner-down-left"
        :label="$t('pages.calendar.quickCreate')"
        type="submit"
        :disabled="!quickTitle.trim() || saving"
      />
    </form>
    <div class="calendar-day-panel__capacity">
      <span
        ><b>{{ Math.round((selectedMinutes / 60) * 10) / 10 }}h</b> / 8h</span
      ><em>{{ selectedPercent }}%</em><i><b :style="{ width: `${selectedPercent}%` }" /></i>
    </div>
    <p
      v-if="selectedConflicts.size"
      class="calendar-day-panel__warning"
    >
      <UIcon name="i-lucide-triangle-alert" />{{
        $t('pages.calendar.conflictWarning', { count: selectedConflicts.size })
      }}
    </p>
    <div class="calendar-day-panel__tasks">
      <article
        v-for="task in selectedTasks"
        :key="task.id"
        class="calendar-day-panel__task"
        :class="{ 'is-conflict': selectedConflicts.has(task.id) }"
      >
        <button @click="emit('open', task)">
          <span>{{ task.plannedTime || '—' }}</span
          ><strong>{{ task.title }}</strong>
        </button>
        <IconButton
          :icon="task.dayRank ? 'i-lucide-star' : 'i-lucide-star-off'"
          :label="$t('pages.calendar.toggleTop')"
          size="sm"
          @click="emit('set-top', task)"
        />
      </article>
    </div>
  </aside>
</template>
