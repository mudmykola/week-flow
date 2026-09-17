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

<style scoped src="~/presentation/assets/css/components/review/review-day-digest.css"></style>
