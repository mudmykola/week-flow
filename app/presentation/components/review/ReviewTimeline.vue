<script setup lang="ts">
import type { ReviewTimelineEvent, ReviewTask } from '~/domain/entities/review'

const props = defineProps<{ events: ReviewTimelineEvent[]; tasks: ReviewTask[] }>()
const emit = defineEmits<{ open: [task: ReviewTask] }>()
type Filter = 'all' | ReviewTimelineEvent['kind']
const filter = ref<Filter>('all')
const filters: Filter[] = ['all', 'result', 'progress', 'subtask', 'focus', 'rescheduled', 'blocker']
const visible = computed(() =>
  filter.value === 'all' ? props.events : props.events.filter((item) => item.kind === filter.value)
)
function openTask(id: string) {
  const task = props.tasks.find((item) => item.id === id)
  if (task) emit('open', task)
}
function icon(kind: ReviewTimelineEvent['kind']) {
  return {
    result: 'i-lucide-circle-check',
    progress: 'i-lucide-activity',
    decision: 'i-lucide-git-fork',
    blocker: 'i-lucide-ban',
    subtask: 'i-lucide-list-checks',
    focus: 'i-lucide-timer',
    rescheduled: 'i-lucide-calendar-sync'
  }[kind]
}
function time(value: number) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(value)
}
</script>

<template>
  <section class="review-timeline">
    <div class="review-timeline__filters">
      <button
        v-for="item in filters"
        :key="item"
        :class="{ 'is-active': filter === item }"
        @click="filter = item"
      >
        <UIcon
          v-if="item !== 'all'"
          :name="icon(item)"
        />{{ $t(`pages.review.final.filter.${item}`) }}
      </button>
    </div>
    <div
      v-if="visible.length"
      class="review-timeline__list surface-card"
    >
      <button
        v-for="event in visible"
        :key="event.id"
        class="review-timeline__event"
        :class="`is-${event.kind}`"
        @click="openTask(event.taskId)"
      >
        <time>{{ time(event.createdAt) }}</time
        ><span class="review-timeline__marker"><UIcon :name="icon(event.kind)" /></span
        ><span
          ><strong>{{ event.taskTitle }}</strong
          ><small v-if="event.subtaskTitle">{{ event.subtaskTitle }}</small>
          <p v-if="event.detail">{{ event.detail }}</p>
          <p v-else-if="event.kind === 'focus'">{{ $t('pages.review.final.focusFor', { minutes: event.minutes }) }}</p>
          <p v-else-if="event.kind === 'rescheduled'">
            {{
              $t('pages.review.final.movedFromTo', {
                previous: event.previousDate || $t('pages.review.progress.noDate'),
                next: event.nextDate || $t('pages.review.progress.noDate')
              })
            }}
          </p>
          <p v-else>{{ $t(`pages.review.final.event.${event.kind}`) }}</p></span
        ><SemanticBadge
          v-if="event.minutes && event.kind !== 'focus'"
          tone="info"
          size="sm"
          >{{ event.minutes }} {{ $t('pages.review.progress.minShort') }}</SemanticBadge
        >
      </button>
    </div>
    <EmptyState
      v-else
      :title="$t('pages.review.final.emptyTimeline')"
      :description="$t('pages.review.final.emptyTimelineHint')"
      icon="i-lucide-calendar-search"
    />
  </section>
</template>

<style scoped>
.review-timeline__filters {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.review-timeline__filters button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 999px;
  color: var(--color-text-secondary);
  font-size: 0.64rem;
}
.review-timeline__filters button.is-active {
  color: var(--color-bg);
  background: var(--color-text-primary);
  border-color: transparent;
}
.review-timeline__list {
  overflow: hidden;
}
.review-timeline__event {
  display: grid;
  grid-template-columns: 3.3rem 1.8rem minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.45rem;
  width: 100%;
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid var(--color-panel-border);
  text-align: left;
}
.review-timeline__event:last-child {
  border-bottom: 0;
}
.review-timeline__event:hover {
  background: var(--color-bg-alt);
}
.review-timeline__event > time {
  padding-top: 0.25rem;
  color: var(--color-text-secondary);
  font-size: 0.61rem;
}
.review-timeline__marker {
  display: grid;
  width: 1.7rem;
  height: 1.7rem;
  place-items: center;
  border-radius: 50%;
  color: var(--color-accent);
  background: var(--color-accent-soft);
}
.review-timeline__event.is-result .review-timeline__marker,
.review-timeline__event.is-subtask .review-timeline__marker {
  color: #10b981;
  background: rgb(16 185 129 / 0.1);
}
.review-timeline__event.is-blocker .review-timeline__marker {
  color: var(--color-danger);
  background: rgb(239 68 68 / 0.1);
}
.review-timeline__event strong,
.review-timeline__event small {
  display: block;
}
.review-timeline__event strong {
  font-size: 0.73rem;
}
.review-timeline__event small {
  color: var(--color-text-secondary);
  font-size: 0.61rem;
}
.review-timeline__event p {
  margin-top: 0.18rem;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  line-height: 1.4;
}
@media (max-width: 520px) {
  .review-timeline__event {
    grid-template-columns: 1.7rem minmax(0, 1fr) auto;
  }
  .review-timeline__event > time {
    display: none;
  }
}
</style>
