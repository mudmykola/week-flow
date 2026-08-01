<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string | number | null>()
withDefaults(defineProps<{ type?: string; size?: 'sm' | 'md' }>(), { type: 'text', size: 'md' })
</script>

<template>
  <input
    v-model="model"
    :type="type"
    class="form-input ui-control"
    :class="`ui-control--${size}`"
    v-bind="$attrs"
  />
</template>
