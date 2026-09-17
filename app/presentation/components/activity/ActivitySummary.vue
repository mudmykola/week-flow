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

<style scoped src="~/presentation/assets/css/components/activity/activity-summary.css"></style>
