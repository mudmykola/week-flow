<script setup lang="ts">
import type { AutomationExecution, WorkflowStage } from '~/domain/entities/workflow'

const props = defineProps<{
  executions: AutomationExecution[]
  stages: WorkflowStage[]
  stageUsage: Record<string, number>
}>()

const metrics = computed(() => {
  const success = props.executions.filter((item) => item.status === 'success').length
  const failed = props.executions.filter((item) => item.status === 'failed').length
  const bottleneck = props.stages
    .slice()
    .sort((a, b) => (props.stageUsage[b.id] ?? 0) - (props.stageUsage[a.id] ?? 0))[0]
  return {
    success,
    failed,
    rate: props.executions.length ? Math.round((success / props.executions.length) * 100) : 0,
    bottleneck
  }
})
</script>

<template>
  <div class="workflow-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <MetricCard
      :label="$t('pages.workflows.successfulRuns')"
      :value="metrics.success"
      icon="i-lucide-circle-check"
      tone="success"
    />
    <MetricCard
      :label="$t('pages.workflows.failedRuns')"
      :value="metrics.failed"
      icon="i-lucide-circle-x"
    />
    <MetricCard
      :label="$t('pages.workflows.successRate')"
      :value="`${metrics.rate}%`"
      icon="i-lucide-gauge"
    />
    <MetricCard
      :label="$t('pages.workflows.bottleneck')"
      :value="metrics.bottleneck?.name || '—'"
      icon="i-lucide-triangle-alert"
      :hint="
        metrics.bottleneck ? $t('pages.workflows.taskCount', { count: stageUsage[metrics.bottleneck.id] ?? 0 }) : ''
      "
    />
  </div>
</template>
