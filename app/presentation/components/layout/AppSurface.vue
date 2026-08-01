<script setup lang="ts">
withDefaults(defineProps<{ as?: string; padded?: boolean; interactive?: boolean }>(), { as: 'section', padded: true })
</script>

<template>
  <component
    :is="as"
    class="app-surface ui-surface"
    :class="[
      {
        'app-surface--padded ui-surface--padded': padded,
        'app-surface--interactive ui-surface--interactive': interactive
      }
    ]"
    v-bind="$attrs"
    ><slot
  /></component>
</template>
