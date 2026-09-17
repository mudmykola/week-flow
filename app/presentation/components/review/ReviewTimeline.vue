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

<style scoped src="~/presentation/assets/css/components/review/review-timeline.css"></style>
