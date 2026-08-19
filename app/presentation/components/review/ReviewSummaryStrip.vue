<script setup lang="ts">
defineProps<{ tasks: number; results: number; blockers: number; focusMinutes: number }>()
</script>

<template>
  <section
    class="review-summary-strip surface-card"
    :aria-label="$t('pages.review.v2.daySummary')"
  >
    <div>
      <UIcon name="i-lucide-list-checks" /><span>{{ $t('pages.review.v2.tasksWorked') }}</span
      ><strong>{{ tasks }}</strong>
    </div>
    <div>
      <UIcon name="i-lucide-circle-check-big" /><span>{{ $t('pages.review.v2.results') }}</span
      ><strong>{{ results }}</strong>
    </div>
    <div :class="{ 'is-warning': blockers }">
      <UIcon name="i-lucide-triangle-alert" /><span>{{ $t('pages.review.v2.blockers') }}</span
      ><strong>{{ blockers }}</strong>
    </div>
    <div>
      <UIcon name="i-lucide-timer" /><span>{{ $t('pages.review.v2.focus') }}</span
      ><strong>{{ focusMinutes }} {{ $t('pages.review.progress.minShort') }}</strong>
    </div>
  </section>
</template>

<style scoped>
.review-summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  margin-bottom: 0.65rem;
}
.review-summary-strip div {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.65rem 0.8rem;
  border-right: 1px solid var(--color-panel-border);
}
.review-summary-strip div:last-child {
  border-right: 0;
}
.review-summary-strip svg {
  color: var(--color-accent);
}
.review-summary-strip span {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.review-summary-strip strong {
  font-size: 0.78rem;
}
.review-summary-strip .is-warning svg,
.review-summary-strip .is-warning strong {
  color: #f59e0b;
}
@media (max-width: 700px) {
  .review-summary-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .review-summary-strip div:nth-child(2) {
    border-right: 0;
  }
  .review-summary-strip div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--color-panel-border);
  }
}
</style>
