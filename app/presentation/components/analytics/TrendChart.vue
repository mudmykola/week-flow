<script setup lang="ts">
import VisAxis from '@unovis/vue/components/axis'
import VisCrosshair from '@unovis/vue/components/crosshair'
import VisLine from '@unovis/vue/components/line'
import VisTooltip from '@unovis/vue/components/tooltip'
import VisXYContainer from '@unovis/vue/containers/xy-container'

type TrendPoint = { label: string; created: number; done: number; overdue: number }

const props = defineProps<{ data: TrendPoint[] }>()
const { t } = useI18n()
const colors = ['#fe5011', '#64748b', '#ef4444']
const lines = [
  { key: 'done', label: computed(() => t('analyticsComponents.completed')) },
  { key: 'created', label: computed(() => t('analyticsComponents.total')) },
  { key: 'overdue', label: computed(() => t('analyticsComponents.overdue')) }
] as const

const x = (_point: TrendPoint, index: number) => index
const xTick = (index: number) => props.data[index]?.label ?? ''
const tooltipTemplate = (point: TrendPoint) => `
  <div style="padding:10px 12px;min-width:150px">
    <strong>${point.label}</strong>
    <div style="margin-top:6px;color:#fe5011">${t('analyticsComponents.completed')}: ${point.done}</div>
    <div style="color:#64748b">${t('analyticsComponents.total')}: ${point.created}</div>
    <div style="color:#ef4444">${t('analyticsComponents.overdue')}: ${point.overdue}</div>
  </div>`
</script>

<template>
  <div
    class="trend-chart w-full"
    role="img"
    :aria-label="$t('analyticsComponents.trendLabel')"
  >
    <div class="mb-3 flex flex-wrap gap-4 text-xs">
      <span
        v-for="(line, index) in lines"
        :key="line.key"
        class="text-secondary inline-flex items-center gap-2"
      >
        <span
          class="size-2.5 rounded-full"
          :style="{ background: colors[index] }"
        />
        {{ line.label.value }}
      </span>
    </div>
    <VisXYContainer
      :data="data"
      :height="260"
      :padding="{ top: 12, right: 12, bottom: 28, left: 30 }"
      :y-domain="[0, undefined]"
    >
      <VisLine
        v-for="(line, index) in lines"
        :key="line.key"
        :x="x"
        :y="(point: TrendPoint) => point[line.key]"
        :color="colors[index]"
        :line-width="line.key === 'done' ? 3.5 : 2.5"
        curve-type="monotoneX"
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
        :num-ticks="5"
        :grid-line="true"
        :domain-line="false"
        :tick-line="false"
      />
      <VisTooltip />
      <VisCrosshair
        color="#fe5011"
        :template="tooltipTemplate"
      />
    </VisXYContainer>
  </div>
</template>
