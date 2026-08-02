<script setup lang="ts">
import VisDonut from '@unovis/vue/components/donut'
import VisSingleContainer from '@unovis/vue/containers/single-container'

type BreakdownItem = { label: string; value: number; color: string; key?: string }

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
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        class="text-secondary flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]"
        @click="emit('select', item)"
      >
        <span
          class="size-2.5 rounded-full"
          :style="{ background: item.color }"
        />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
        <strong class="text-[var(--color-text-primary)]">{{ item.value }}</strong>
      </button>
    </div>
  </div>
</template>
