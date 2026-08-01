<script setup lang="ts">
defineProps<{ label: string; value: string | number; icon: string; tone?: 'accent' | 'success' | 'warning' | 'danger'; trend?: string; hint?: string }>()
</script>

<template>
  <article class="surface-card metric-card">
    <div class="flex items-start justify-between gap-4">
      <span class="metric-icon" :data-tone="tone || 'accent'"><UIcon :name="icon" class="size-5" /></span>
      <span v-if="trend" class="trend-badge" :class="trend.startsWith('+') ? 'text-emerald-600' : trend.startsWith('−') || trend.startsWith('-') ? 'text-red-500' : 'text-secondary'">{{ trend }}</span>
    </div>
    <p class="font-display mt-5 text-3xl tabular-nums">{{ value }}</p>
    <p class="mt-1 text-sm font-medium">{{ label }}</p>
    <p v-if="hint" class="mt-1 text-xs text-secondary">{{ hint }}</p>
  </article>
</template>
