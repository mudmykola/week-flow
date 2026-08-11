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

function selectMode(mode: Mode) {
  void navigateTo({ path: '/today', query: mode === 'today' ? {} : { mode } })
}
</script>

<template>
  <div class="today-page">
    <div
      class="today-page__view-switch"
      role="group"
      :aria-label="$t('pages.today.viewSwitch')"
    >
      <button
        v-for="mode in MODES"
        :key="mode"
        type="button"
        class="today-page__view-button"
        :class="{ 'today-page__view-button--active': activeMode === mode }"
        @click="selectMode(mode)"
      >
        <UIcon :name="ICONS[mode]" />{{ $t(LABEL_KEYS[mode]) }}
      </button>
    </div>
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

<style scoped>
.today-page__view-switch {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
  width: fit-content;
}
.today-page__view-button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border-radius: 0.55rem;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}
.today-page__view-button--active {
  background: var(--color-bg-alt);
  color: var(--color-text-primary);
}
</style>
