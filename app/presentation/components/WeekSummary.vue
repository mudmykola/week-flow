<script setup lang="ts">
import { calculateProgress } from '~/domain/services/progress'

const props = defineProps<{
  total: number
  done: number
}>()

const emit = defineEmits<{
  moveIncomplete: []
}>()

const progress = computed(() => calculateProgress(props.done, props.total))
const hasIncomplete = computed(() => props.total - props.done > 0)
</script>

<template>
  <div class="glass-panel flex items-center justify-between gap-6 px-6 py-4">
    <div class="flex-1">
      <div class="mb-2 flex items-center justify-between text-sm text-secondary">
        <span>{{ done }} / {{ total }} виконано</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          class="h-full rounded-full"
          style="background-color: var(--color-accent)"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <button
      v-if="hasIncomplete"
      type="button"
      class="shrink-0 rounded-lg border border-black/10 px-4 py-2 text-sm text-secondary hover:text-black"
      @click="emit('moveIncomplete')"
    >
      Перенести незавершені →
    </button>
  </div>
</template>
