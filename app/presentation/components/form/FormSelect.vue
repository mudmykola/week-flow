<script setup lang="ts" generic="T extends string | number | null">
defineOptions({ inheritAttrs: false })
const model = defineModel<T>()
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <select
    v-model="model"
    class="form-select ui-control"
    :class="`ui-control--${size}`"
    v-bind="$attrs"
  >
    <slot />
  </select>
</template>
