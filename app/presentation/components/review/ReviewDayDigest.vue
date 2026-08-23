<script setup lang="ts">
import type { DailyReviewData } from '~/domain/entities/review'

defineProps<{ previous: DailyReviewData; current: DailyReviewData; previousLabel: string; currentLabel: string }>()
</script>

<template>
  <section class="review-day-digest">
    <article
      class="review-day-digest__card surface-card"
      data-tone="success"
    >
      <header>
        <UIcon name="i-lucide-circle-check-big" /><span>{{ $t('pages.review.close.yesterday') }}</span
        ><small>{{ previousLabel }}</small>
      </header>
      <strong>{{ previous.completed.length + previous.completedSubtasks.length }}</strong>
      <p>{{ $t('pages.review.close.completedHint') }}</p>
    </article>
    <article
      class="review-day-digest__card surface-card"
      data-tone="info"
    >
      <header>
        <UIcon name="i-lucide-sun" /><span>{{ $t('pages.review.close.todayPlan') }}</span
        ><small>{{ currentLabel }}</small>
      </header>
      <strong>{{ current.planned.length }}</strong>
      <p>{{ $t('pages.review.close.plannedHint') }}</p>
    </article>
    <article
      class="review-day-digest__card surface-card"
      data-tone="warning"
    >
      <header>
        <UIcon name="i-lucide-forward" /><span>{{ $t('pages.review.close.carryover') }}</span>
      </header>
      <strong>{{ current.carriedOver.length }}</strong>
      <p>{{ $t('pages.review.close.carryoverHint') }}</p>
    </article>
    <article
      class="review-day-digest__card surface-card"
      data-tone="danger"
    >
      <header>
        <UIcon name="i-lucide-ban" /><span>{{ $t('pages.review.v2.blockers') }}</span>
      </header>
      <strong>{{ current.blockers.length }}</strong>
      <p>{{ $t('pages.review.close.blockersHint') }}</p>
    </article>
  </section>
</template>

<style scoped>
.review-day-digest {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  margin-bottom: 0.65rem;
}
.review-day-digest__card {
  padding: 0.65rem 0.75rem;
  border-left: 2px solid var(--digest-color, var(--color-panel-border));
}
.review-day-digest__card[data-tone='success'] {
  --digest-color: var(--color-success);
}
.review-day-digest__card[data-tone='info'] {
  --digest-color: #3b82f6;
}
.review-day-digest__card[data-tone='warning'] {
  --digest-color: var(--color-warning);
}
.review-day-digest__card[data-tone='danger'] {
  --digest-color: var(--color-danger);
}
.review-day-digest header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--digest-color);
  font-size: 0.68rem;
  font-weight: 800;
}
.review-day-digest header small {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 0.56rem;
  font-weight: 600;
}
.review-day-digest strong {
  display: block;
  margin-top: 0.4rem;
  font-size: 1.25rem;
}
.review-day-digest p {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}
@media (max-width: 800px) {
  .review-day-digest {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
