<script setup lang="ts">
type BreakdownItem = { label: string; value: number; color: string }

const props = defineProps<{ items: BreakdownItem[] }>()
const total = computed(() => props.items.reduce((sum, item) => sum + item.value, 0))
const background = computed(() => {
  if (!total.value) return 'conic-gradient(var(--color-panel-border) 0 100%)'
  let cursor = 0
  const slices = props.items.map((item) => {
    const start = cursor
    cursor += (item.value / total.value) * 100
    return `${item.color} ${start}% ${cursor}%`
  })
  return `conic-gradient(${slices.join(', ')})`
})
</script>

<template>
  <div
    class="donut-breakdown flex w-full flex-col items-center gap-6"
    role="img"
    :aria-label="$t('analyticsComponents.statusDistribution', { count: total })"
  >
    <div
      class="relative size-40 shrink-0 rounded-full"
      :style="{ background }"
    >
      <div class="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-[var(--color-panel)]">
        <strong class="font-display text-3xl">{{ total }}</strong
        ><span class="text-secondary text-xs">{{ $t('analyticsComponents.tasks') }}</span>
      </div>
    </div>
    <div class="w-full space-y-3">
      <div
        v-for="item in items"
        :key="item.label"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="size-2.5 rounded-full"
          :style="{ background: item.color }"
        /><span class="text-secondary flex-1">{{ item.label }}</span
        ><strong>{{ item.value }}</strong>
      </div>
    </div>
  </div>
</template>
