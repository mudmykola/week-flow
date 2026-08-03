<script setup lang="ts">
import type { ActivityDateGroup, ActivityFeedItem } from '~/domain/services/activityFeed'
import { activityDateKey } from '~/domain/services/activityFeed'

const props = defineProps<{ group: ActivityDateGroup }>()
const emit = defineEmits<{ open: [item: ActivityFeedItem] }>()
const { t, locale } = useI18n()
const label = computed(() => {
  const key = activityDateKey(props.group.date)
  if (key !== 'date') return t(`pages.activity.${key}`)
  return new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    props.group.date
  )
})
</script>

<template>
  <section class="activity-date-group">
    <header
      class="activity-date-group__header sticky top-0 z-10 flex items-center gap-3 bg-[var(--color-bg)]/90 py-2 backdrop-blur-xl"
    >
      <h2 class="text-secondary text-xs font-bold tracking-wide uppercase">{{ label }}</h2>
      <span class="h-px flex-1 bg-[var(--color-panel-border)]" />
      <span class="count-badge">{{ group.items.length }}</span>
    </header>
    <div class="activity-date-group__items">
      <ActivityTimelineItem
        v-for="item in group.items"
        :key="item.id"
        :item="item"
        @open="emit('open', $event)"
      />
    </div>
  </section>
</template>
