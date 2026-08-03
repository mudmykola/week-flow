<script setup lang="ts">
const route = useRoute()
const timer = useFocusTimer()
</script>

<template>
  <aside
    v-if="timer.active.value && route.path !== '/focus'"
    class="focus-mini-player surface-card fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 p-3 shadow-xl"
  >
    <button
      class="min-w-0 text-left"
      @click="navigateTo('/focus')"
    >
      <p class="truncate text-xs font-semibold">{{ timer.state.value.taskTitle || $t('pages.focus.break') }}</p>
      <p class="font-display text-xl tabular-nums">{{ timer.display.value }}</p>
    </button>
    <IconButton
      :icon="timer.state.value.running ? 'i-lucide-pause' : 'i-lucide-play'"
      :label="$t('pages.focus.pause')"
      @click="timer.state.value.running ? timer.pause() : timer.resume()"
    />
    <IconButton
      icon="i-lucide-maximize-2"
      :label="$t('nav.focus')"
      @click="navigateTo('/focus')"
    />
  </aside>
</template>
