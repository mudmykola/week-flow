<script setup lang="ts">
const { data: activities, status } = await useFetch('/api/activity')
</script>

<template>
  <div class="app-container max-w-4xl">
    <PageHeader title="Активність" description="Історія змін у задачах і проєктах." icon="i-lucide-activity" :count="activities?.length" />
    <div v-if="status === 'pending'" class="space-y-3"><USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" /></div>
    <div v-else-if="activities?.length" class="surface-card divide-y divide-[var(--color-panel-border)]">
      <div v-for="activity in activities" :key="activity.id" class="flex items-center gap-4 p-4"><span class="page-icon size-9"><UIcon name="i-lucide-history" class="size-4" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ activity.action }}</p><p class="truncate text-xs text-secondary">{{ activity.entityType }} · {{ activity.entityId }}</p></div><time class="shrink-0 text-xs text-secondary">{{ new Date(activity.createdAt).toLocaleString('uk-UA') }}</time></div>
    </div>
    <EmptyState v-else title="Активності ще немає" description="Історія з’явиться після першої зміни задачі або проєкту." icon="i-lucide-history" />
  </div>
</template>
