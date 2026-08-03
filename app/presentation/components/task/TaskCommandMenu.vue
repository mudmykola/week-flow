<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; create: []; search: []; completeSelected: []; archiveSelected: [] }>()
const actions = computed(() => [
  { icon: 'i-lucide-plus', label: 'task.commandCreate', shortcut: 'N', run: () => emit('create') },
  { icon: 'i-lucide-search', label: 'task.commandSearch', shortcut: '/', run: () => emit('search') },
  {
    icon: 'i-lucide-circle-check-big',
    label: 'task.commandComplete',
    shortcut: '',
    run: () => emit('completeSelected')
  },
  { icon: 'i-lucide-archive', label: 'task.commandArchive', shortcut: '', run: () => emit('archiveSelected') }
])
function runAction(action: (typeof actions.value)[number]) {
  action.run()
  emit('close')
}
</script>

<template>
  <Teleport to="body"
    ><div
      v-if="open"
      class="task-command-menu fixed inset-0 z-70 flex items-start justify-center bg-black/45 p-4 pt-[15vh]"
      @click.self="emit('close')"
    >
      <section class="glass-panel w-full max-w-lg overflow-hidden p-2">
        <header class="text-secondary flex items-center gap-2 px-3 py-2 text-xs">
          <UIcon name="i-lucide-command" />{{ $t('task.commandPalette') }}
        </header>
        <button
          v-for="action in actions"
          :key="action.label"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-[var(--color-bg-alt)]"
          @click="runAction(action)"
        >
          <UIcon :name="action.icon" /><span class="flex-1">{{ $t(action.label) }}</span
          ><kbd
            v-if="action.shortcut"
            class="text-secondary"
            >{{ action.shortcut }}</kbd
          >
        </button>
      </section>
    </div></Teleport
  >
</template>
