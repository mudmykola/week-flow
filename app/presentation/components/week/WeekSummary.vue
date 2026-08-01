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
  <section
    class="week-summary surface-card flex min-h-[4.5rem] items-center justify-between gap-3 px-3 py-2 sm:px-4"
    :aria-label="$t('board.progress')"
  >
    <div class="flex-1">
      <div class="mb-2 flex items-center justify-between gap-4 text-sm">
        <span
          ><strong>{{ done }}</strong
          ><span class="text-secondary"> / {{ $t('board.completedCount', { count: total }) }}</span></span
        >
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
      class="text-secondary hidden shrink-0 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)] sm:inline-flex"
      @click="emit('moveIncomplete')"
    >
      <UIcon
        name="i-lucide-forward"
        class="size-4"
      />{{ $t('board.move') }}
    </button>
  </section>
</template>
