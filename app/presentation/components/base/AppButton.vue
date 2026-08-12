<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    type?: ButtonHTMLAttributes['type']
    icon?: string
    iconOnly?: boolean
    block?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' }
)
</script>

<template>
  <button
    :type="props.type"
    class="app-button ui-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      `ui-button--${variant}`,
      `ui-button--${size}`,
      {
        'app-button--block w-full': block,
        'app-button--icon-only ui-button--icon-only': iconOnly,
        'app-button--loading': loading
      }
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
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
