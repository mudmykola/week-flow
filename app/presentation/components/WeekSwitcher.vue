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
  <div class="glass-panel flex items-center justify-between px-6 py-4">
    <button
      type="button"
      class="rounded-lg px-3 py-1.5 text-xl text-secondary hover:text-black"
      aria-label="Попередній тиждень"
      @click="emit('prev')"
    >
      ←
    </button>

    <div class="flex flex-col items-center">
      <span class="font-display text-xl">{{ week }}</span>
      <span class="text-sm text-secondary">{{ label }}</span>
    </div>

    <div class="flex items-center gap-3">
      <button
        v-if="!isCurrentWeek"
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm text-secondary hover:text-black"
        @click="emit('today')"
      >
        Сьогодні
      </button>
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-xl text-secondary hover:text-black"
        aria-label="Наступний тиждень"
        @click="emit('next')"
      >
        →
      </button>
    </div>
  </div>
</template>
