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
<style scoped src="~/presentation/assets/css/components/common/semantic-badge.css"></style>
