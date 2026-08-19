<script setup lang="ts">
import type { ReviewAttentionItem, ReviewTask } from '~/domain/entities/review'

defineProps<{ items: ReviewAttentionItem[] }>()
const emit = defineEmits<{ open: [task: ReviewTask] }>()
</script>

<template>
  <section
    v-if="items.length"
    class="review-attention-queue surface-card"
  >
    <header>
      <div>
        <h2><UIcon name="i-lucide-sparkles" />{{ $t('pages.review.final.attention') }}</h2>
        <p>{{ $t('pages.review.final.attentionHint') }}</p>
      </div>
      <SemanticBadge tone="warning">{{ items.length }}</SemanticBadge>
    </header>
    <div class="review-attention-queue__list">
      <button
        v-for="item in items"
        :key="item.id"
        @click="emit('open', item.task)"
      >
        <span class="review-attention-queue__icon"
          ><UIcon
            :name="
              item.kind === 'blocker'
                ? 'i-lucide-ban'
                : item.kind === 'frequent_reschedule'
                  ? 'i-lucide-repeat-2'
                  : item.kind === 'missing_next_step'
                    ? 'i-lucide-route'
                    : 'i-lucide-circle-dashed'
            "
        /></span>
        <span
          ><strong>{{ item.task.title }}</strong
          ><small>{{ $t(`pages.review.final.attentionKind.${item.kind}`, { count: item.count || 0 }) }}</small></span
        ><UIcon name="i-lucide-chevron-right" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.review-attention-queue {
  padding: 0.7rem;
  margin-bottom: 0.65rem;
  border-color: rgb(245 158 11 / 0.35);
}
.review-attention-queue header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  margin-bottom: 0.55rem;
}
.review-attention-queue h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 800;
}
.review-attention-queue h2 svg {
  color: #f59e0b;
}
.review-attention-queue p,
.review-attention-queue small {
  color: var(--color-text-secondary);
  font-size: 0.64rem;
}
.review-attention-queue__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}
.review-attention-queue__list button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.65rem;
  background: var(--color-bg-alt);
  text-align: left;
}
.review-attention-queue__list button > span:nth-child(2),
.review-attention-queue strong,
.review-attention-queue small {
  display: block;
  min-width: 0;
}
.review-attention-queue strong {
  overflow: hidden;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.review-attention-queue__icon {
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  place-items: center;
  border-radius: 0.5rem;
  color: #f59e0b;
  background: rgb(245 158 11 / 0.1);
}
@media (max-width: 680px) {
  .review-attention-queue__list {
    grid-template-columns: 1fr;
  }
}
</style>
