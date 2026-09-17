<script setup lang="ts">
import type { SavedDailyReview } from '~/domain/entities/review'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
const props = defineProps<{ selectedDate: string; history: SavedDailyReview[]; maxDate: string }>()
const emit = defineEmits<{ select: [date: string] }>()
const days = computed(() => {
  const start = addDays(startOfWeek(parseISO(props.selectedDate), { weekStartsOn: 1 }), -28)
  return Array.from({ length: 35 }, (_, i) => {
    const date = format(addDays(start, i), 'yyyy-MM-dd')
    return { date, review: props.history.find((item) => item.reviewDate === date) }
  })
})
</script>

<template>
  <section class="review-history-calendar surface-card">
    <header>
      <UIcon name="i-lucide-calendar-check-2" /><strong>{{ $t('pages.review.close.history') }}</strong
      ><span>{{ $t('pages.review.close.historyHint') }}</span>
    </header>
    <div>
      <button
        v-for="day in days"
        :key="day.date"
        :class="{ 'is-selected': day.date === selectedDate }"
        :data-status="day.review?.status || 'empty'"
        :title="day.date"
        :disabled="day.date > maxDate"
        @click="emit('select', day.date)"
      >
        {{ format(parseISO(day.date), 'd') }}
      </button>
    </div>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-history-calendar.css"></style>
