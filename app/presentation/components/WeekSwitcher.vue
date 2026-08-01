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
  <section class="surface-card flex min-h-[4.5rem] items-center justify-between gap-2 px-2.5 py-2 sm:px-3" aria-label="Навігація тижнями">
    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-panel-border)] text-secondary hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
      aria-label="Попередній тиждень"
      @click="emit('prev')"
    >
      <UIcon name="i-lucide-chevron-left" class="size-5" />
    </button>

    <div class="flex flex-col items-center">
      <span class="font-display text-lg sm:text-xl">{{ week }}</span>
      <span class="text-xs text-secondary sm:text-sm">{{ label }}</span>
    </div>

    <div class="flex items-center gap-1.5">
      <button
        v-if="!isCurrentWeek"
        type="button"
        class="hidden rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-bg-alt)] sm:block"
        @click="emit('today')"
      >
        Сьогодні
      </button>
      <button
        type="button"
        class="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-panel-border)] text-secondary hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
        aria-label="Наступний тиждень"
        @click="emit('next')"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </button>
    </div>
  </section>
</template>
