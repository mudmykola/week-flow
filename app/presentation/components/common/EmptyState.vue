<script setup lang="ts">
defineProps<{ title: string; description: string; icon?: string }>()
</script>

<template>
  <div class="empty-state surface-card grid min-h-40 place-items-center p-5 text-center">
    <div>
      <span class="page-icon mx-auto mb-4"
        ><UIcon
          :name="icon || 'i-lucide-inbox'"
          class="size-5"
      /></span>
      <p class="font-display text-lg">{{ title }}</p>
      <p class="text-secondary mx-auto mt-2 max-w-md text-sm">{{ description }}</p>
      <div
        v-if="$slots.default"
        class="mt-5"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
