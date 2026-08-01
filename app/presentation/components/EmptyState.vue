<script setup lang="ts">
defineProps<{ title: string; description: string; icon?: string }>()
</script>

<template>
  <div class="surface-card grid min-h-56 place-items-center p-8 text-center">
    <div>
      <span class="page-icon mx-auto mb-4"><UIcon :name="icon || 'i-lucide-inbox'" class="size-5" /></span>
      <p class="font-display text-lg">{{ title }}</p>
      <p class="mx-auto mt-2 max-w-md text-sm text-secondary">{{ description }}</p>
      <div v-if="$slots.default" class="mt-5"><slot /></div>
    </div>
  </div>
</template>
