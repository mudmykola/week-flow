<script setup lang="ts">
import VisDonut from '@unovis/vue/components/donut'
import VisSingleContainer from '@unovis/vue/containers/single-container'
import type { ChartLegendItem } from './ChartLegendButton.vue'

type BreakdownItem = ChartLegendItem

const props = defineProps<{ items: BreakdownItem[] }>()
const emit = defineEmits<{ select: [item: BreakdownItem] }>()
const total = computed(() => props.items.reduce((sum, item) => sum + item.value, 0))
</script>

<template>
  <div
    class="donut-breakdown w-full"
    role="img"
    :aria-label="$t('analyticsComponents.statusDistribution', { count: total })"
  >
    <div class="relative mx-auto h-[190px] max-w-[250px]">
      <VisSingleContainer
        :data="items"
        :height="190"
      >
        <VisDonut
          :value="(item: BreakdownItem) => item.value"
          :color="(item: BreakdownItem) => item.color"
          :arc-width="28"
          :corner-radius="6"
          :pad-angle="0.025"
        />
      </VisSingleContainer>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong class="font-display text-3xl">{{ total }}</strong>
        <span class="text-secondary text-xs">{{ $t('analyticsComponents.tasks') }}</span>
      </div>
    </div>
    <div class="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
      <ChartLegendButton
        v-for="item in items"
        :key="item.label"
        :item="item"
        layout="split"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
