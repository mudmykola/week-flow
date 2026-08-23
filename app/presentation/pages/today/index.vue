<script setup lang="ts">
const MODES = ['today', 'upcoming', 'overdue', 'archive'] as const
type Mode = (typeof MODES)[number]

const ICONS: Record<Mode, string> = {
  today: 'i-lucide-sun',
  upcoming: 'i-lucide-clock-3',
  overdue: 'i-lucide-triangle-alert',
  archive: 'i-lucide-archive'
}
const LABEL_KEYS: Record<Mode, string> = {
  today: 'nav.today',
  upcoming: 'nav.upcoming',
  overdue: 'nav.overdue',
  archive: 'nav.archive'
}

const route = useRoute()
const activeMode = computed<Mode>(() => {
  const value = route.query.mode
  return typeof value === 'string' && (MODES as readonly string[]).includes(value) ? (value as Mode) : 'today'
})
</script>

<template>
  <div class="today-page">
    <TodayWorkspace v-if="activeMode === 'today'" />
    <TaskListView
      v-else
      :key="activeMode"
      :mode="activeMode"
      :title="$t(LABEL_KEYS[activeMode])"
      :icon="ICONS[activeMode]"
    />
  </div>
</template>
