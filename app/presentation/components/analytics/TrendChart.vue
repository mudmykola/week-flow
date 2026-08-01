<script setup lang="ts">
type TrendPoint = { label: string; done: number; total: number }

const props = defineProps<{ data: TrendPoint[] }>()

const width = 720
const height = 240
const padding = { top: 16, right: 16, bottom: 34, left: 28 }
const maxValue = computed(() => Math.max(...props.data.flatMap((item) => [item.done, item.total]), 1))

function coordinates(key: 'done' | 'total') {
  const drawableWidth = width - padding.left - padding.right
  const drawableHeight = height - padding.top - padding.bottom
  return props.data
    .map((item, index) => {
      const x =
        padding.left + (props.data.length === 1 ? drawableWidth / 2 : (index / (props.data.length - 1)) * drawableWidth)
      const y = padding.top + drawableHeight - (item[key] / maxValue.value) * drawableHeight
      return `${x},${y}`
    })
    .join(' ')
}

const totalPoints = computed(() => coordinates('total'))
const donePoints = computed(() => coordinates('done'))
</script>

<template>
  <div
    class="trend-chart w-full"
    role="img"
    :aria-label="$t('analyticsComponents.trendLabel')"
  >
    <div class="text-secondary mb-3 flex flex-wrap gap-4 text-xs">
      <span class="flex items-center gap-2"
        ><span class="size-2.5 rounded-full bg-[var(--color-accent)]" />{{ $t('analyticsComponents.completed') }}</span
      >
      <span class="flex items-center gap-2"
        ><span class="size-2.5 rounded-full bg-slate-400" />{{ $t('analyticsComponents.total') }}</span
      >
    </div>
    <svg
      class="h-auto w-full overflow-visible"
      :viewBox="`0 0 ${width} ${height}`"
    >
      <line
        v-for="step in 4"
        :key="step"
        :x1="padding.left"
        :x2="width - padding.right"
        :y1="padding.top + (step - 1) * 62"
        :y2="padding.top + (step - 1) * 62"
        stroke="currentColor"
        class="text-[var(--color-panel-border)]"
        stroke-width="1"
      />
      <polyline
        :points="totalPoints"
        fill="none"
        stroke="#94a3b8"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline
        :points="donePoints"
        fill="none"
        stroke="#fe5011"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <g
        v-for="(item, index) in data"
        :key="item.label"
      >
        <circle
          :cx="
            padding.left +
            (data.length === 1
              ? (width - padding.left - padding.right) / 2
              : (index / (data.length - 1)) * (width - padding.left - padding.right))
          "
          :cy="
            padding.top +
            (height - padding.top - padding.bottom) -
            (item.done / maxValue) * (height - padding.top - padding.bottom)
          "
          r="5"
          fill="#fe5011"
        >
          <title>
            {{ item.label }}: {{ $t('analyticsComponents.completedOf', { done: item.done, total: item.total }) }}
          </title>
        </circle>
        <text
          :x="
            padding.left +
            (data.length === 1
              ? (width - padding.left - padding.right) / 2
              : (index / (data.length - 1)) * (width - padding.left - padding.right))
          "
          :y="height - 8"
          text-anchor="middle"
          class="text-secondary fill-current text-[11px]"
        >
          {{ item.label }}
        </text>
      </g>
    </svg>
  </div>
</template>
