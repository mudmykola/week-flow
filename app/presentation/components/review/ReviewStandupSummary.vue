<script setup lang="ts">
import type { DailyReviewData, ReviewTask } from '~/domain/entities/review'

const props = defineProps<{ data: DailyReviewData }>()
const emit = defineEmits<{ open: [task: ReviewTask] }>()

const sections = computed(() => [
  {
    key: 'yesterday',
    icon: 'i-lucide-history',
    tone: 'success',
    items: unique([...props.data.completed, ...props.data.workedOn]),
    empty: 'pages.review.v2.emptyWorkedOn'
  },
  {
    key: 'today',
    icon: 'i-lucide-sun-medium',
    tone: 'accent',
    items: unique(props.data.planned),
    empty: 'pages.review.v2.emptyNextFocus'
  },
  {
    key: 'blockers',
    icon: 'i-lucide-triangle-alert',
    tone: 'danger',
    items: unique(props.data.blockers),
    empty: 'pages.review.v2.emptyBlockers'
  }
])

function unique(tasks: ReviewTask[]) {
  return [...new Map(tasks.map((task) => [task.id, task])).values()]
}
</script>

<template>
  <AppSurface class="review-standup-summary">
    <header class="review-standup-summary__header">
      <div>
        <p>{{ $t('pages.review.v2.dailyStandup') }}</p>
        <h2>{{ $t('pages.review.v2.dayDiff') }}</h2>
      </div>
      <div class="review-standup-summary__metrics">
        <span><UIcon name="i-lucide-circle-check-big" />{{ data.completed.length }}</span>
        <span><UIcon name="i-lucide-timer" />{{ data.focusMinutes }} {{ $t('pages.review.progress.minShort') }}</span>
        <span><UIcon name="i-lucide-forward" />{{ data.carriedOver.length }}</span>
      </div>
    </header>

    <div class="review-standup-summary__grid">
      <section
        v-for="section in sections"
        :key="section.key"
        class="review-standup-summary__section"
        :class="`review-standup-summary__section--${section.tone}`"
      >
        <h3>
          <UIcon :name="section.icon" />
          {{ $t(`pages.review.v2.summarySections.${section.key}`) }}
          <small>{{ section.items.length }}</small>
        </h3>
        <div v-if="section.items.length">
          <button
            v-for="task in section.items.slice(0, 5)"
            :key="task.id"
            type="button"
            @click="emit('open', task)"
          >
            <span>{{ task.title }}</span>
            <UIcon name="i-lucide-chevron-right" />
          </button>
          <p
            v-if="section.items.length > 5"
            class="review-standup-summary__more"
          >
            +{{ section.items.length - 5 }}
          </p>
        </div>
        <p
          v-else
          class="review-standup-summary__empty"
        >
          {{ $t(section.empty) }}
        </p>
      </section>
    </div>
  </AppSurface>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-standup-summary.css"></style>
