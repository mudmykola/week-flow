<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    variant?: 'ghost' | 'danger'
    size?: 'sm' | 'md'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'ghost', size: 'md' }
)
</script>

<template>
  <AppButton
    :icon="props.icon"
    :variant="props.variant"
    :size="props.size"
    :loading="props.loading"
    :disabled="props.disabled"
    icon-only
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
  />
</template>
