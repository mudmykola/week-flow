<script setup lang="ts">
export interface ChartLegendItem {
  label: string
  value: number
  color: string
  key?: string
}

withDefaults(
  defineProps<{
    item: ChartLegendItem
    layout?: 'inline' | 'split'
  }>(),
  { layout: 'inline' }
)
defineEmits<{ select: [item: ChartLegendItem] }>()
</script>

<template>
  <AppButton
    variant="ghost"
    size="sm"
    class="chart-legend-button"
    :class="`chart-legend-button--${layout}`"
    :style="{ '--legend-color': item.color }"
    :aria-label="`${item.label}: ${item.value}`"
    @click="$emit('select', item)"
  >
    <span
      class="chart-legend-button__swatch"
      :style="{ '--legend-color': item.color }"
      aria-hidden="true"
    />
    <span class="chart-legend-button__label">{{ item.label }}</span>
    <span
      v-if="layout === 'inline'"
      aria-hidden="true"
      >·</span
    >
    <strong class="chart-legend-button__value">{{ item.value }}</strong>
  </AppButton>
</template>

<style scoped src="~/presentation/assets/css/components/analytics/chart-legend-button.css"></style>
