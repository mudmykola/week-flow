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
  <section class="surface-card flex min-h-[4.5rem] items-center justify-between gap-3 px-3 py-2 sm:px-4" aria-label="Прогрес тижня">
    <div class="flex-1">
      <div class="mb-2 flex items-center justify-between gap-4 text-sm">
        <span><strong>{{ done }}</strong><span class="text-secondary"> / {{ total }} виконано</span></span>
        <strong class="text-[var(--color-accent)]">{{ progress }}%</strong>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
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
      class="hidden shrink-0 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-semibold text-secondary hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)] sm:inline-flex"
      @click="emit('moveIncomplete')"
    >
      <UIcon name="i-lucide-forward" class="size-4" />Перенести
    </button>
  </section>
</template>
