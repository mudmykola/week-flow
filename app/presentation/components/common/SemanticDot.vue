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
<style scoped src="~/presentation/assets/css/components/common/semantic-dot.css"></style>
