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

<style scoped>
.today-time-task-card {
  position: relative;
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--color-panel-bg) 88%, var(--color-bg-alt));
  transition:
    border-color 0.15s,
    transform 0.15s,
    box-shadow 0.15s;
}
.today-time-task-card:hover {
  border-color: color-mix(in srgb, var(--color-accent) 42%, var(--color-panel-border));
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.1);
  transform: translateY(-1px);
}
.today-time-task-card::before {
  position: absolute;
  inset: 0.7rem auto 0.7rem 0;
  width: 2px;
  border-radius: 99px;
  background: var(--color-accent);
  content: '';
}
.today-time-task-card--low::before {
  opacity: 0.28;
}
.today-time-task-card--medium::before {
  opacity: 0.55;
}
.today-time-task-card--high::before {
  opacity: 0.8;
}
.today-time-task-card--urgent::before {
  background: var(--color-danger);
}
.today-time-task-card__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.5rem;
}
.today-time-task-card__check {
  display: grid;
  width: 1.3rem;
  height: 1.3rem;
  place-items: center;
  margin-top: 0.05rem;
  color: var(--color-text-secondary);
}
.today-time-task-card__title {
  min-width: 0;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 720;
  line-height: 1.3;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.today-time-task-card__edit {
  opacity: 0;
}
.today-time-task-card:hover .today-time-task-card__edit,
.today-time-task-card:focus-within .today-time-task-card__edit {
  opacity: 1;
}
.today-time-task-card__context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  padding-left: 1.8rem;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}
.today-time-task-card__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding-left: 1.8rem;
}
.today-time-task-card__context span,
.today-time-task-card__footer,
.today-time-task-card__time,
.today-time-task-card__estimate {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.today-time-task-card__context span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.today-time-task-card__footer {
  min-width: 0;
  padding-top: 0.45rem;
  border-top: 1px solid color-mix(in srgb, var(--color-panel-border) 75%, transparent);
}
.today-time-task-card__time {
  min-width: 0;
  height: 1.75rem;
  padding: 0 0.35rem;
  border-radius: 0.45rem;
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
}
.today-time-task-card__time input {
  width: 4.5rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.7rem;
}
.today-time-task-card__estimate {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  white-space: nowrap;
}
.today-time-task-card__zone-select {
  display: none;
  width: 100%;
  height: 2rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  background: var(--color-bg-alt);
  color: var(--color-text-primary);
  font-size: 0.7rem;
}
@media (max-width: 700px) {
  .today-time-task-card__title {
    white-space: normal;
  }
  .today-time-task-card__edit {
    opacity: 1;
  }
  .today-time-task-card__zone-select {
    display: block;
  }
}
</style>
