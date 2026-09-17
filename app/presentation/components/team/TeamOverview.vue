<script setup lang="ts">
import type { TeamMetrics } from '~/domain/entities/team'
defineProps<{ members: number; metrics: TeamMetrics }>()
</script>

<template>
  <section class="team-overview mb-3 grid gap-3 sm:grid-cols-3">
    <MetricCard
      :label="$t('pages.team.members')"
      :value="members"
      icon="i-lucide-users"
    />
    <MetricCard
      :label="$t('pages.team.tasksDone')"
      :value="`${metrics.done}/${metrics.tasks}`"
      icon="i-lucide-list-checks"
      tone="success"
    />
    <MetricCard
      :label="$t('pages.team.goalProgress')"
      :value="`${metrics.goalProgress}%`"
      icon="i-lucide-target"
    />
  </section>
</template>
