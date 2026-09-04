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

<style scoped>
.review-standup-summary {
  padding: 0.8rem;
}
.review-standup-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.7rem;
}
.review-standup-summary__header p {
  color: var(--color-accent);
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.review-standup-summary__header h2 {
  font-size: 0.95rem;
  font-weight: 850;
}
.review-standup-summary__metrics {
  display: flex;
  gap: 0.35rem;
}
.review-standup-summary__metrics span {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.3rem 0.45rem;
  border-radius: 0.5rem;
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
  font-size: 0.64rem;
  font-weight: 700;
}
.review-standup-summary__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}
.review-standup-summary__section {
  min-width: 0;
  padding: 0.65rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.7rem;
}
.review-standup-summary__section h3 {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.42rem;
  font-size: 0.72rem;
  font-weight: 800;
}
.review-standup-summary__section h3 small {
  margin-left: auto;
  color: var(--color-text-secondary);
}
.review-standup-summary__section--success h3 > svg {
  color: #10b981;
}
.review-standup-summary__section--accent h3 > svg {
  color: var(--color-accent);
}
.review-standup-summary__section--danger h3 > svg {
  color: #ef4444;
}
.review-standup-summary__section button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.4rem 0.25rem;
  border-top: 1px solid color-mix(in srgb, var(--color-panel-border) 65%, transparent);
  text-align: left;
  font-size: 0.68rem;
}
.review-standup-summary__section button span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.review-standup-summary__section button svg {
  flex: none;
  color: var(--color-text-secondary);
}
.review-standup-summary__empty,
.review-standup-summary__more {
  padding: 0.5rem 0.2rem;
  color: var(--color-text-secondary);
  font-size: 0.63rem;
}
@media (max-width: 760px) {
  .review-standup-summary__grid {
    grid-template-columns: 1fr;
  }
  .review-standup-summary__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .review-standup-summary__metrics {
    width: 100%;
  }
  .review-standup-summary__metrics span {
    flex: 1;
    justify-content: center;
  }
}
</style>
