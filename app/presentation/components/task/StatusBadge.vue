<script setup lang="ts">
import type { TaskStatus } from '~/domain/entities/task'
import type { SemanticTone } from '~/presentation/components/common/SemanticBadge.vue'
const props = defineProps<{ status: TaskStatus }>()
const options: Record<TaskStatus, { tone: SemanticTone; icon: string }> = {
  todo: { tone: 'neutral', icon: 'i-lucide-circle' },
  in_progress: { tone: 'info', icon: 'i-lucide-loader-circle' },
  done: { tone: 'success', icon: 'i-lucide-circle-check-big' }
}
const config = computed(() => options[props.status])
</script>
<template>
  <SemanticBadge
    class="status-badge"
    :tone="config.tone"
    :icon="config.icon"
    >{{ $t(`task.statusValue.${status}`) }}</SemanticBadge
  >
</template>
