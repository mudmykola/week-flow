<script setup lang="ts">
import type { SemanticTone } from './SemanticBadge.vue'
withDefaults(defineProps<{ tone?: SemanticTone; label: string }>(), { tone: 'neutral' })
</script>
<template>
  <span
    class="semantic-dot"
    :class="`semantic-dot--${tone}`"
    ><i aria-hidden="true" />{{ label }}</span
  >
</template>
<style scoped>
.semantic-dot {
  --semantic-color: var(--color-neutral);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--semantic-color);
  font-size: 0.7rem;
  font-weight: 700;
}
.semantic-dot i {
  width: 0.45rem;
  height: 0.45rem;
  flex: none;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 12%, transparent);
}
.semantic-dot--success {
  --semantic-color: var(--color-success);
}
.semantic-dot--info {
  --semantic-color: var(--color-info);
}
.semantic-dot--warning {
  --semantic-color: var(--color-warning);
}
.semantic-dot--attention {
  --semantic-color: var(--color-accent);
}
.semantic-dot--danger {
  --semantic-color: var(--color-danger);
}
.semantic-dot--violet {
  --semantic-color: var(--color-violet);
}
</style>
