<script setup lang="ts">
import type { ReviewAttentionItem, ReviewTask } from '~/domain/entities/review'

defineProps<{ items: ReviewAttentionItem[]; resolving?: string | null }>()
const emit = defineEmits<{
  resolve: [task: ReviewTask, action: 'tomorrow' | 'date' | 'unscheduled' | 'complete', date?: string]
  open: [task: ReviewTask]
}>()
const dates = reactive<Record<string, string>>({})
</script>

<template>
  <section
    v-if="items.length"
    class="review-decision-queue surface-card"
  >
    <header>
      <div>
        <h2><UIcon name="i-lucide-route" />{{ $t('pages.review.close.decisions') }}</h2>
        <p>{{ $t('pages.review.close.decisionsHint') }}</p>
      </div>
      <SemanticBadge tone="warning">{{ items.length }}</SemanticBadge>
    </header>
    <div class="review-decision-queue__list">
      <article
        v-for="item in items"
        :key="item.id"
      >
        <button
          class="review-decision-queue__task"
          @click="emit('open', item.task)"
        >
          <strong>{{ item.task.title }}</strong
          ><small>{{ $t(`pages.review.final.attentionKind.${item.kind}`, { count: item.count || 0 }) }}</small>
        </button>
        <div class="review-decision-queue__actions">
          <AppButton
            size="sm"
            variant="secondary"
            icon="i-lucide-sunrise"
            :disabled="resolving === item.task.id"
            @click="emit('resolve', item.task, 'tomorrow')"
            >{{ $t('pages.review.close.tomorrow') }}</AppButton
          >
          <label
            ><UIcon name="i-lucide-calendar-days" /><input
              v-model="dates[item.task.id]"
              type="date"
              @change="dates[item.task.id] && emit('resolve', item.task, 'date', dates[item.task.id])"
          /></label>
          <IconButton
            icon="i-lucide-calendar-off"
            :label="$t('pages.review.close.unscheduled')"
            :disabled="resolving === item.task.id"
            @click="emit('resolve', item.task, 'unscheduled')"
          />
          <IconButton
            icon="i-lucide-check"
            :label="$t('pages.review.close.complete')"
            :disabled="resolving === item.task.id"
            @click="emit('resolve', item.task, 'complete')"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped src="~/presentation/assets/css/components/review/review-decision-queue.css"></style>
