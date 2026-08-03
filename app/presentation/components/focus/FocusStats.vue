<script setup lang="ts">
defineProps<{
  minutes: number
  completed: number
  streak: number
  goal: number
  week: Array<{ key: string; minutes: number }>
}>()
const emit = defineEmits<{ 'update:goal': [value: number] }>()
</script>

<template>
  <section class="focus-stats surface-card grid gap-3 p-3 sm:grid-cols-3">
    <div>
      <p class="text-secondary text-xs">{{ $t('pages.focus.todayMinutes') }}</p>
      <strong class="font-display text-2xl">{{ minutes }}</strong
      ><span class="text-secondary ml-1 text-xs">/</span>
      <input
        class="ml-1 w-12 bg-transparent text-xs font-semibold outline-none"
        type="number"
        min="15"
        max="600"
        :value="goal"
        :aria-label="$t('pages.focus.dailyGoal')"
        @change="emit('update:goal', Number(($event.target as HTMLInputElement).value))"
      />
    </div>
    <div>
      <p class="text-secondary text-xs">{{ $t('pages.focus.sessions') }}</p>
      <strong class="font-display text-2xl">{{ completed }}</strong>
    </div>
    <div>
      <p class="text-secondary text-xs">{{ $t('pages.focus.streak') }}</p>
      <strong class="font-display text-2xl">{{ streak }}</strong>
    </div>
    <div
      class="focus-stats__week col-span-full flex h-12 items-end gap-1"
      :aria-label="$t('pages.focus.last7Days')"
    >
      <span
        v-for="day in week"
        :key="day.key"
        class="min-h-1 flex-1 rounded-t bg-[var(--color-accent)]/70"
        :style="{ height: `${Math.max(8, Math.min(100, day.minutes))}%` }"
        :title="`${day.key}: ${day.minutes}`"
      />
    </div>
  </section>
</template>
