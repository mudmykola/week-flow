<script setup lang="ts">
import type { AdminMetrics } from '~/domain/entities/admin'
defineProps<{ metrics: AdminMetrics }>()
</script>

<template>
  <section class="admin-metrics">
    <MetricCard
      :label="$t('pages.admin.totalUsers')"
      :value="metrics.users"
      :trend="$t('pages.admin.newUsers', { count: metrics.newUsers })"
      icon="i-lucide-users"
    />
    <MetricCard
      :label="$t('pages.admin.managers')"
      :value="metrics.managers"
      :hint="$t('pages.admin.adminCount', { count: metrics.admins })"
      icon="i-lucide-user-cog"
    />
    <MetricCard
      :label="$t('pages.admin.teamsProjects')"
      :value="`${metrics.teams}/${metrics.projects}`"
      icon="i-lucide-network"
    />
    <MetricCard
      :label="$t('pages.admin.systemTasks')"
      :value="metrics.tasks"
      :hint="$t('pages.admin.overdueCount', { count: metrics.overdue })"
      icon="i-lucide-list-checks"
      :tone="metrics.overdue ? 'danger' : undefined"
    />
  </section>
</template>
