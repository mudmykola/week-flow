<script setup lang="ts">
defineProps<{ open: boolean; align?: 'left' | 'right' }>()
</script>

<template>
  <div
    v-if="open"
    class="dropdown-menu ui-dropdown"
    :class="align === 'left' ? 'dropdown-menu--left left-0' : 'dropdown-menu--right right-0'"
    role="menu"
  >
    <slot />
  </div>
</template>
