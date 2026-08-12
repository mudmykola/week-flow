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

<style scoped>
.chart-legend-button {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-align: left;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    color 0.15s;
}
.chart-legend-button--inline {
  padding: 0.375rem 0.625rem;
  border-color: var(--color-panel-border);
}
.chart-legend-button--split {
  display: flex;
  width: 100%;
  padding: 0.375rem 0.5rem;
}
.chart-legend-button:hover,
.chart-legend-button:focus-visible {
  border-color: color-mix(in srgb, var(--legend-color, var(--color-info)) 45%, var(--color-panel-border));
  background: var(--color-bg-alt);
  color: var(--color-text-primary);
}
.chart-legend-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-accent) 60%, transparent);
  outline-offset: 2px;
}
.chart-legend-button__swatch {
  width: 0.625rem;
  height: 0.625rem;
  flex: none;
  border-radius: 50%;
  background: var(--legend-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--legend-color) 13%, transparent);
}
.chart-legend-button__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-legend-button--split .chart-legend-button__label {
  flex: 1;
}
.chart-legend-button__value {
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
