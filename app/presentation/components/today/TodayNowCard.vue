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

<style scoped src="~/presentation/assets/css/components/today/today-now-card.css"></style>
