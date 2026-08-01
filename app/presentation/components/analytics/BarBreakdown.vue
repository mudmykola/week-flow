<script setup lang="ts">
type BreakdownItem = { label: string; value: number; color: string }
const props = defineProps<{ items: BreakdownItem[] }>()
const maxValue = computed(() => Math.max(...props.items.map((item) => item.value), 1))
</script>

<template>
  <div
    class="bar-breakdown space-y-5"
    role="img"
    :aria-label="$t('analyticsComponents.priorityDistribution')"
  >
    <div
      v-for="item in items"
      :key="item.label"
    >
      <div class="mb-2 flex items-center justify-between text-sm">
        <span class="text-secondary">{{ item.label }}</span
        ><strong>{{ item.value }}</strong>
      </div>
      <div class="h-3 overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
        <div
          class="h-full min-w-0 rounded-full transition-[width] duration-500"
          :style="{ width: `${(item.value / maxValue) * 100}%`, background: item.color }"
        />
      </div>
    </div>
  </div>
</template>
