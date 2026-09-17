<script setup lang="ts">
import type { Task, UpdateTaskInput } from '~/domain/entities/task'
import type { TimeZoneKey } from '~/domain/services/daySchedule'

defineProps<{
  task: Task
  projectName?: string
  assigneeName?: string
  zoneKey: TimeZoneKey
  zoneOptions: TimeZoneKey[]
}>()
const emit = defineEmits<{
  edit: []
  focus: []
  toggle: []
  patch: [patch: UpdateTaskInput]
  moveZone: [key: TimeZoneKey]
}>()
function updateTime(event: Event) {
  emit('patch', { plannedTime: (event.target as HTMLInputElement).value || null })
}
</script>

<template>
  <article
    class="today-time-task-card"
    :class="`today-time-task-card--${task.priority}`"
  >
    <header class="today-time-task-card__header">
      <button
        class="today-time-task-card__check"
        type="button"
        :aria-label="$t('common.done')"
        @click="emit('toggle')"
      >
        <UIcon :name="task.status === 'done' ? 'i-lucide-circle-check-big' : 'i-lucide-circle'" />
      </button>
      <button
        class="today-time-task-card__title"
        type="button"
        @click="emit('edit')"
      >
        {{ task.title }}
      </button>
      <IconButton
        class="today-time-task-card__edit"
        icon="i-lucide-pencil"
        :label="$t('common.edit')"
        size="sm"
        @click="emit('edit')"
      />
    </header>
    <div
      v-if="projectName || assigneeName"
      class="today-time-task-card__context"
    >
      <span v-if="projectName"><UIcon name="i-lucide-folder" />{{ projectName }}</span>
      <span v-if="assigneeName"><UIcon name="i-lucide-user-round" />{{ assigneeName }}</span>
    </div>
    <div class="today-time-task-card__labels">
      <PriorityBadge :priority="task.priority" />
      <SemanticBadge
        v-if="task.workState === 'review'"
        tone="violet"
        icon="i-lucide-scan-search"
        >{{ $t('task.workStateValue.review') }}</SemanticBadge
      >
      <SemanticBadge
        v-if="task.blockedByTaskId"
        tone="danger"
        icon="i-lucide-lock-keyhole"
        >{{ $t('board.blocked') }}</SemanticBadge
      >
    </div>
    <footer class="today-time-task-card__footer">
      <label class="today-time-task-card__time">
        <UIcon name="i-lucide-clock-3" />
        <input
          type="time"
          :value="task.plannedTime || ''"
          :aria-label="$t('task.plannedTime')"
          @change="updateTime"
        />
      </label>
      <span class="today-time-task-card__estimate"
        ><UIcon name="i-lucide-hourglass" />{{ task.estimateMinutes || 25 }} {{ $t('task.minuteShort') }}</span
      >
      <IconButton
        icon="i-lucide-timer"
        :label="$t('pages.today.startFocus')"
        size="sm"
        @click="emit('focus')"
      />
    </footer>
    <select
      class="today-time-task-card__zone-select"
      :value="zoneKey"
      :aria-label="$t('pages.today.timeZones.moveTo')"
      @change="emit('moveZone', ($event.target as HTMLSelectElement).value as TimeZoneKey)"
    >
      <option
        v-for="option in zoneOptions"
        :key="option"
        :value="option"
      >
        {{ $t(`pages.today.timeZones.${option}`) }}
      </option>
    </select>
  </article>
</template>

<style scoped src="~/presentation/assets/css/components/today/today-time-task-card.css"></style>
