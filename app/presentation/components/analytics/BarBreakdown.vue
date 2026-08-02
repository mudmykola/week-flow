<script setup lang="ts">
import VisAxis from '@unovis/vue/components/axis'
import VisGroupedBar from '@unovis/vue/components/grouped-bar'
import VisXYContainer from '@unovis/vue/containers/xy-container'

type BreakdownItem = { label: string; value: number; color: string; key?: string }

const props = defineProps<{ items: BreakdownItem[] }>()
const emit = defineEmits<{ select: [item: BreakdownItem] }>()
const x = (_item: BreakdownItem, index: number) => index
const xTick = (index: number) => props.items[index]?.label ?? ''
</script>

<template>
  <div
    class="bar-breakdown"
    role="img"
    :aria-label="$t('analyticsComponents.priorityDistribution')"
  >
    <VisXYContainer
      :data="items"
      :height="220"
      :padding="{ top: 8, right: 8, bottom: 34, left: 28 }"
      :y-domain="[0, undefined]"
    >
      <VisGroupedBar
        :x="x"
        :y="(item: BreakdownItem) => item.value"
        :color="(item: BreakdownItem) => item.color"
        :rounded-corners="6"
        :bar-padding="0.25"
      />
      <VisAxis
        type="x"
        :tick-format="xTick"
        :grid-line="false"
        :domain-line="false"
        :tick-line="false"
      />
      <VisAxis
        type="y"
        :num-ticks="4"
        :grid-line="true"
        :domain-line="false"
        :tick-line="false"
      />
    </VisXYContainer>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        class="text-secondary inline-flex items-center gap-2 rounded-lg border border-[var(--color-panel-border)] px-2.5 py-1.5 text-xs transition hover:text-[var(--color-text-primary)]"
        @click="emit('select', item)"
      >
        <span
          class="size-2 rounded-full"
          :style="{ background: item.color }"
        />
        {{ item.label }} · {{ item.value }}
      </button>
    </div>
  </div>
</template>
