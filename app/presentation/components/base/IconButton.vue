<script setup lang="ts">
withDefaults(defineProps<{ icon: string; label: string; variant?: 'ghost' | 'danger'; size?: 'sm' | 'md' }>(), {
  variant: 'ghost',
  size: 'md'
})
</script>

<template>
  <button
    type="button"
    class="icon-button ui-icon-button"
    :class="[
      `icon-button--${variant}`,
      `icon-button--${size}`,
      `ui-icon-button--${variant}`,
      `ui-icon-button--${size}`
    ]"
    :title="label"
    :aria-label="label"
    v-bind="$attrs"
  >
    <UIcon :name="icon" />
  </button>
</template>
