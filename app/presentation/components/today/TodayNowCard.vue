<script setup lang="ts">
import type { Task } from '~/domain/entities/task'

const props = defineProps<{
  task: Task | null
  projectName?: string
  focusActive: boolean
  focusRunning: boolean
  focusDisplay: string
}>()
const emit = defineEmits<{ focus: []; toggle: []; edit: []; pause: []; resume: [] }>()

function toggleFocus() {
  if (props.focusRunning) emit('pause')
  else emit('resume')
}
</script>

<template>
  <section class="today-now-card surface-card">
    <header class="today-now-card__header">
      <span><UIcon name="i-lucide-zap" />{{ $t('pages.today.now') }}</span>
      <strong v-if="focusActive">{{ focusDisplay }}</strong>
    </header>

    <div
      v-if="task"
      class="today-now-card__task"
    >
      <button
        type="button"
        class="today-now-card__check"
        :aria-label="$t('taskActions.complete')"
        @click="emit('toggle')"
      >
        <UIcon name="i-lucide-circle" />
      </button>
      <button
        type="button"
        class="today-now-card__content"
        @click="emit('edit')"
      >
        <strong>{{ task.title }}</strong>
        <span>
          <template v-if="task.plannedTime"><UIcon name="i-lucide-clock-3" />{{ task.plannedTime }}</template>
          <template v-if="task.estimateMinutes"
            ><UIcon name="i-lucide-hourglass" />{{ task.estimateMinutes }} {{ $t('task.minuteShort') }}</template
          >
          <template v-if="projectName"><UIcon name="i-lucide-folder" />{{ projectName }}</template>
        </span>
      </button>
      <AppButton
        v-if="!focusActive"
        icon="i-lucide-play"
        @click="emit('focus')"
        >{{ $t('pages.today.startFocus') }}</AppButton
      >
      <AppButton
        v-else
        variant="secondary"
        :icon="focusRunning ? 'i-lucide-pause' : 'i-lucide-play'"
        @click="toggleFocus"
        >{{ focusRunning ? $t('pages.focus.pause') : $t('pages.focus.resume') }}</AppButton
      >
    </div>

    <div
      v-else
      class="today-now-card__empty"
    >
      <UIcon name="i-lucide-circle-dashed" />
      <div>
        <strong>{{ $t('pages.today.noCurrent') }}</strong>
        <p>{{ $t('pages.today.noCurrentHint') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.today-now-card {
  padding: 1rem;
  border-color: color-mix(in srgb, var(--color-accent) 38%, var(--color-panel-border));
  background: color-mix(in srgb, var(--color-accent) 5%, var(--color-panel-bg));
}
.today-now-card__header,
.today-now-card__task,
.today-now-card__empty,
.today-now-card__header span,
.today-now-card__content span {
  display: flex;
  align-items: center;
}
.today-now-card__header {
  justify-content: space-between;
  margin-bottom: 0.8rem;
  color: var(--color-accent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.today-now-card__header span,
.today-now-card__content span {
  gap: 0.4rem;
}
.today-now-card__header strong {
  font-variant-numeric: tabular-nums;
}
.today-now-card__task {
  gap: 0.75rem;
}
.today-now-card__check {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-accent);
  font-size: 1.45rem;
}
.today-now-card__content {
  min-width: 0;
  flex: 1;
  text-align: left;
}
.today-now-card__content strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.05rem;
}
.today-now-card__content span {
  flex-wrap: wrap;
  margin-top: 0.3rem;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
}
.today-now-card__empty {
  gap: 0.7rem;
  color: var(--color-text-secondary);
}
.today-now-card__empty > svg {
  font-size: 1.5rem;
}
.today-now-card__empty strong {
  color: var(--color-text-primary);
}
.today-now-card__empty p {
  margin-top: 0.15rem;
  font-size: 0.78rem;
}
@media (max-width: 640px) {
  .today-now-card__task {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .today-now-card__content {
    flex-basis: calc(100% - 2.5rem);
  }
  .today-now-card__task :deep(.base-button) {
    width: 100%;
  }
}
</style>
