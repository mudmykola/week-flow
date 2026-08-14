<script setup lang="ts">
const density = defineModel<'comfortable' | 'compact'>('density', { required: true })
const collapsedDone = defineModel<boolean>('collapsedDone', { required: true })
</script>

<template>
  <div class="week-board-toolbar mb-3 flex items-center justify-between gap-3">
    <p class="week-board-toolbar__hint text-secondary hidden text-xs sm:block">
      <UIcon
        name="i-lucide-grip-vertical"
        class="mr-1 inline size-3.5"
      />{{ $t('board.dragHint') }}
    </p>
    <div
      class="week-board-toolbar__actions ml-auto flex rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1"
    >
      <AppButton
        variant="ghost"
        size="sm"
        :icon="density === 'comfortable' ? 'i-lucide-rows-3' : 'i-lucide-rows-4'"
        @click="density = density === 'comfortable' ? 'compact' : 'comfortable'"
      >
        {{ density === 'comfortable' ? $t('board.compact') : $t('board.comfortable') }}
      </AppButton>
      <AppButton
        variant="ghost"
        size="sm"
        :icon="collapsedDone ? 'i-lucide-panel-right-open' : 'i-lucide-panel-right-close'"
        @click="collapsedDone = !collapsedDone"
      >
        {{ collapsedDone ? $t('board.showDone') : $t('board.hideDone') }}
      </AppButton>
    </div>
  </div>
</template>
