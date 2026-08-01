<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    icon?: string
    block?: boolean
    loading?: boolean
  }>(),
  { variant: 'secondary', size: 'md' }
)
</script>

<template>
  <button
    type="button"
    class="app-button ui-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      `ui-button--${variant}`,
      `ui-button--${size}`,
      { 'app-button--block w-full': block, 'app-button--loading': loading }
    ]"
    :disabled="loading"
    v-bind="$attrs"
  >
    <UIcon
      v-if="loading"
      name="i-lucide-loader-circle"
      class="size-4 animate-spin"
    />
    <UIcon
      v-else-if="icon"
      :name="icon"
      class="size-4"
    />
    <slot />
  </button>
</template>
