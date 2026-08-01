<script setup lang="ts">
defineProps<{
  label: string
  week: string
  isCurrentWeek: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  today: []
}>()
</script>

<template>
  <section
    class="week-switcher surface-card grid min-h-[4.5rem] grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 px-2.5 py-2 sm:px-3"
    :aria-label="$t('board.weekNavigation')"
  >
    <button
      type="button"
      class="text-secondary grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-panel-border)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
      :aria-label="$t('board.previousWeek')"
      @click="emit('prev')"
    >
      <UIcon
        name="i-lucide-chevron-left"
        class="size-5"
      />
    </button>

    <div class="flex min-w-0 flex-col items-center">
      <span class="font-display text-lg sm:text-xl">{{ week }}</span>
      <span class="text-secondary text-xs sm:text-sm">{{ label }}</span>
      <button
        v-if="!isCurrentWeek"
        type="button"
        class="mt-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-bg-alt)]"
        @click="emit('today')"
      >
        {{ $t('board.currentWeek') }}
      </button>
    </div>

    <button
      type="button"
      class="text-secondary grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-panel-border)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
      :aria-label="$t('board.nextWeek')"
      @click="emit('next')"
    >
      <UIcon
        name="i-lucide-chevron-right"
        class="size-5"
      />
    </button>
  </section>
</template>
