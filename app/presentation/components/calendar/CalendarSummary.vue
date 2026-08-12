<script setup lang="ts">
defineProps<{ total: number; unscheduled: number; conflicts: number; selectedMinutes: number }>()
</script>

<template>
  <div class="calendar-summary">
    <AppSurface class="calendar-metric"
      ><UIcon name="i-lucide-calendar-check" />
      <div>
        <span>{{ $t('pages.calendar.planned') }}</span
        ><strong>{{ total }}</strong>
      </div></AppSurface
    >
    <AppSurface class="calendar-metric"
      ><UIcon name="i-lucide-inbox" />
      <div>
        <span>{{ $t('pages.calendar.unscheduled') }}</span
        ><strong>{{ unscheduled }}</strong>
      </div></AppSurface
    >
    <AppSurface
      class="calendar-metric"
      :class="{ 'calendar-metric--danger': conflicts }"
      ><UIcon name="i-lucide-triangle-alert" />
      <div>
        <span>{{ $t('pages.calendar.conflicts') }}</span
        ><strong>{{ conflicts }}</strong>
      </div></AppSurface
    >
    <AppSurface class="calendar-metric"
      ><UIcon name="i-lucide-clock-3" />
      <div>
        <span>{{ $t('pages.calendar.selectedLoad') }}</span
        ><strong>{{ Math.round((selectedMinutes / 60) * 10) / 10 }}h</strong>
      </div></AppSurface
    >
  </div>
</template>
