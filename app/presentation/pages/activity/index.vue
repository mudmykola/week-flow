<script setup lang="ts">
const { data: activities, status } = await useFetch('/api/activity')
</script>

<template>
  <div class="activity-page app-container max-w-4xl">
    <PageHeader
      :title="$t('pages.activity.title')"
      :description="$t('pages.activity.description')"
      icon="i-lucide-activity"
      :count="activities?.length"
    />
    <div
      v-if="status === 'pending'"
      class="space-y-3"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-16 rounded-xl"
      />
    </div>
    <div
      v-else-if="activities?.length"
      class="surface-card divide-y divide-[var(--color-panel-border)]"
    >
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-center gap-3 p-3"
      >
        <span class="page-icon size-8"
          ><UIcon
            name="i-lucide-history"
            class="size-4"
        /></span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ activity.action }}</p>
          <p class="text-secondary truncate text-xs">{{ activity.entityType }} · {{ activity.entityId }}</p>
        </div>
        <time class="text-secondary shrink-0 text-xs">{{ new Date(activity.createdAt).toLocaleString('uk-UA') }}</time>
      </div>
    </div>
    <EmptyState
      v-else
      :title="$t('pages.activity.empty')"
      :description="$t('pages.activity.emptyHint')"
      icon="i-lucide-history"
    />
  </div>
</template>
