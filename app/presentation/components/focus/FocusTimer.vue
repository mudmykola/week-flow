<script setup lang="ts">
defineProps<{ display: string; progress: number; running: boolean }>()
const emit = defineEmits<{ toggle: []; reset: []; stop: [] }>()
</script>

<template>
  <section class="focus-timer flex flex-col items-center text-center">
    <div
      class="focus-timer__ring relative grid size-64 place-items-center sm:size-80"
      :style="{ '--focus-progress': `${progress * 360}deg` }"
    >
      <div class="absolute inset-3 rounded-full bg-[var(--color-panel-bg)]" />
      <span class="font-display relative text-6xl tracking-tight tabular-nums sm:text-7xl">{{ display }}</span>
    </div>
    <div class="mt-6 flex flex-wrap justify-center gap-2">
      <AppButton
        variant="primary"
        :icon="running ? 'i-lucide-pause' : 'i-lucide-play'"
        @click="emit('toggle')"
      >
        {{ running ? $t('pages.focus.pause') : $t('pages.focus.start') }}
      </AppButton>
      <IconButton
        icon="i-lucide-rotate-ccw"
        :label="$t('pages.focus.reset')"
        @click="emit('reset')"
      />
      <IconButton
        icon="i-lucide-square"
        :label="$t('pages.focus.stopSession')"
        @click="emit('stop')"
      />
    </div>
    <p class="text-secondary mt-3 text-xs">
      Space · {{ $t('pages.focus.pause') }} / {{ $t('pages.focus.start') }} · R · {{ $t('pages.focus.reset') }}
    </p>
  </section>
</template>
