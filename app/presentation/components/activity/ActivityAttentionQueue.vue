<script setup lang="ts">
import type { ActivityFeedItem } from '~/domain/services/activityFeed'
import { activityIcon } from '~/domain/services/activityFeed'

defineProps<{ items: ActivityFeedItem[] }>()
const emit = defineEmits<{ open: [item: ActivityFeedItem] }>()
</script>

<template>
  <section
    v-if="items.length"
    class="activity-attention-queue surface-card"
  >
    <header>
      <div>
        <h2><UIcon name="i-lucide-bell-ring" />{{ $t('pages.activity.attentionTitle') }}</h2>
        <p>{{ $t('pages.activity.attentionHint') }}</p>
      </div>
      <span>{{ items.length }}</span>
    </header>
    <div>
      <button
        v-for="item in items.slice(0, 4)"
        :key="item.id"
        @click="emit('open', item)"
      >
        <UIcon :name="activityIcon(item.action)" />
        <span
          ><strong>{{ item.entityTitle || item.metadata.title }}</strong
          ><small>{{ $t(`activityActions.${item.action}`) }}</small></span
        >
        <UIcon name="i-lucide-chevron-right" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.activity-attention-queue {
  padding: 0.75rem;
  margin-top: 0.65rem;
  border-color: color-mix(in srgb, var(--color-danger) 28%, var(--color-panel-border));
}
.activity-attention-queue header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.activity-attention-queue h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 800;
}
.activity-attention-queue h2 svg {
  color: var(--color-danger);
}
.activity-attention-queue p,
.activity-attention-queue small {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}
.activity-attention-queue header > span {
  padding: 0.2rem 0.48rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
  font-size: 0.68rem;
  font-weight: 800;
}
.activity-attention-queue > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  margin-top: 0.6rem;
}
.activity-attention-queue button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem;
  border-radius: 0.6rem;
  background: var(--color-bg-alt);
  text-align: left;
}
.activity-attention-queue button > span,
.activity-attention-queue strong,
.activity-attention-queue small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-attention-queue strong {
  font-size: 0.72rem;
}
@media (max-width: 700px) {
  .activity-attention-queue > div {
    grid-template-columns: 1fr;
  }
}
</style>
