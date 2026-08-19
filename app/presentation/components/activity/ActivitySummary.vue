<script setup lang="ts">
import type { ActivitySummary } from '~/domain/services/activityFeed'

defineProps<{ summary: ActivitySummary }>()
const emit = defineEmits<{ select: [kind: keyof ActivitySummary] }>()
const items: Array<{ kind: keyof ActivitySummary; icon: string; tone: string }> = [
  { kind: 'attention', icon: 'i-lucide-triangle-alert', tone: 'danger' },
  { kind: 'completed', icon: 'i-lucide-circle-check-big', tone: 'success' },
  { kind: 'moved', icon: 'i-lucide-calendar-sync', tone: 'warning' },
  { kind: 'conversations', icon: 'i-lucide-messages-square', tone: 'info' }
]
</script>

<template>
  <section
    class="activity-summary"
    :aria-label="$t('pages.activity.summaryLabel')"
  >
    <button
      v-for="item in items"
      :key="item.kind"
      :data-tone="item.tone"
      @click="emit('select', item.kind)"
    >
      <UIcon :name="item.icon" />
      <span>{{ $t(`pages.activity.summary.${item.kind}`) }}</span>
      <strong>{{ summary[item.kind] }}</strong>
    </button>
  </section>
</template>

<style scoped>
.activity-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.65rem;
}
.activity-summary button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
  color: var(--color-text-secondary);
  text-align: left;
}
.activity-summary button:hover {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-panel-border));
}
.activity-summary button[data-tone='danger'] svg {
  color: var(--color-danger);
}
.activity-summary button[data-tone='success'] svg {
  color: var(--color-success);
}
.activity-summary button[data-tone='warning'] svg {
  color: var(--color-warning);
}
.activity-summary button[data-tone='info'] svg {
  color: var(--color-info, #3b82f6);
}
.activity-summary span {
  overflow: hidden;
  font-size: 0.68rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-summary strong {
  color: var(--color-text-primary);
  font-size: 0.9rem;
}
@media (max-width: 700px) {
  .activity-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
