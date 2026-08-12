<script setup lang="ts">
import type { TaskPriority } from '~/domain/entities/task'
const props = defineProps<{ priority: TaskPriority }>()
const tone = computed(
  () => (({ urgent: 'danger', high: 'attention', medium: 'info', low: 'neutral' }) as const)[props.priority]
)
</script>
<template>
  <SemanticBadge
    class="priority-badge"
    :tone="tone"
    icon="i-lucide-flag"
    >{{ $t(`task.priorityValue.${priority}`) }}</SemanticBadge
  >
</template>
