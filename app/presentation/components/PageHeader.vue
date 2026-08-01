<script setup lang="ts">
defineProps<{ title: string; description?: string; icon?: string; count?: number }>()
</script>

<template>
  <header class="page-header">
    <div class="min-w-0">
      <div class="flex items-center gap-3">
        <span v-if="icon" class="page-icon"><UIcon :name="icon" class="size-5" /></span>
        <h1 class="font-display text-2xl sm:text-3xl">{{ title }}</h1>
        <span v-if="count !== undefined" class="count-badge">{{ count }}</span>
      </div>
      <p v-if="description" class="mt-2 max-w-2xl text-sm text-secondary sm:text-base">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
