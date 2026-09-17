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

<style scoped src="~/presentation/assets/css/components/activity/activity-attention-queue.css"></style>
