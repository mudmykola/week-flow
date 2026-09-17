<script setup lang="ts">
defineProps<{
  estimate: number
  overdue: number
  unassigned: number
  unplanned: number
}>()
</script>

<template>
  <section
    class="week-insights week-board-page__insights"
    :aria-label="$t('board.insights')"
  >
    <div>
      <UIcon name="i-lucide-hourglass" /><strong>{{ estimate }}</strong
      ><span>{{ $t('board.minutesPlanned') }}</span>
    </div>
    <div :class="{ 'week-board-page__insight--warning': overdue }">
      <UIcon name="i-lucide-triangle-alert" /><strong>{{ overdue }}</strong
      ><span>{{ $t('nav.overdue') }}</span>
    </div>
    <div>
      <UIcon name="i-lucide-user-x" /><strong>{{ unassigned }}</strong
      ><span>{{ $t('board.unassignedTasks') }}</span>
    </div>
    <div>
      <UIcon name="i-lucide-calendar-x" /><strong>{{ unplanned }}</strong
      ><span>{{ $t('board.unplannedTasks') }}</span>
    </div>
  </section>
</template>
