<script setup lang="ts">
export type SemanticTone = 'success' | 'info' | 'warning' | 'attention' | 'danger' | 'violet' | 'neutral'
withDefaults(defineProps<{ tone?: SemanticTone; icon?: string; label?: string; size?: 'sm' | 'md' }>(), {
  tone: 'neutral',
  size: 'sm',
  icon: '',
  label: ''
})
</script>
<template>
  <span
    class="semantic-badge"
    :class="[`semantic-badge--${tone}`, `semantic-badge--${size}`]"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      aria-hidden="true"
    /><span
      ><slot>{{ label }}</slot></span
    >
  </span>
</template>
<style scoped>
.semantic-badge {
  --semantic-color: var(--color-neutral);
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid color-mix(in srgb, var(--semantic-color) 30%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--semantic-color) 12%, transparent);
  color: var(--semantic-color);
  font-weight: 750;
  line-height: 1;
  white-space: nowrap;
}
.semantic-badge span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.semantic-badge--sm {
  min-height: 1.4rem;
  padding: 0.2rem 0.45rem;
  font-size: 0.64rem;
}
.semantic-badge--md {
  min-height: 1.75rem;
  padding: 0.3rem 0.6rem;
  font-size: 0.72rem;
}
.semantic-badge--success {
  --semantic-color: var(--color-success);
}
.semantic-badge--info {
  --semantic-color: var(--color-info);
}
.semantic-badge--warning {
  --semantic-color: var(--color-warning);
}
.semantic-badge--attention {
  --semantic-color: var(--color-accent);
}
.semantic-badge--danger {
  --semantic-color: var(--color-danger);
}
.semantic-badge--violet {
  --semantic-color: var(--color-violet);
}
</style>
