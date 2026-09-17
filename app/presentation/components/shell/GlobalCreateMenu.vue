<script setup lang="ts">
import type { GlobalCreateAction } from '~/domain/entities/globalCreate'

defineProps<{ loading?: boolean }>()
const emit = defineEmits<{ select: [action: GlobalCreateAction] }>()
const open = ref(false)
const root = useTemplateRef<HTMLElement>('root')
const lastAction = useLocalStorage<GlobalCreateAction>('weekflow-last-create-action', 'task')

const actions: Array<{ id: GlobalCreateAction; icon: string; accent?: boolean }> = [
  { id: 'task', icon: 'i-lucide-square-check-big', accent: true },
  { id: 'today', icon: 'i-lucide-sun' },
  { id: 'inbox', icon: 'i-lucide-inbox' },
  { id: 'note', icon: 'i-lucide-sticky-note' },
  { id: 'project', icon: 'i-lucide-folder-plus' }
]

onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))

function select(action: GlobalCreateAction) {
  lastAction.value = action
  open.value = false
  emit('select', action)
}
</script>

<template>
  <div
    ref="root"
    class="global-create-menu global-create"
  >
    <div class="global-create__trigger">
      <button
        class="global-create__primary"
        type="button"
        :disabled="loading"
        @click="select('task')"
      >
        <UIcon
          :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-plus'"
          :class="{ 'animate-spin': loading }"
        />
        <span>{{ $t('shell.newTask') }}</span>
      </button>
      <button
        class="global-create__toggle"
        type="button"
        :aria-label="$t('shell.createMenu')"
        :aria-expanded="open"
        @click="open = !open"
      >
        <UIcon name="i-lucide-chevron-down" />
      </button>
    </div>

    <Teleport to="body">
      <button
        v-if="open"
        class="global-create__backdrop"
        :aria-label="$t('common.close')"
        @click="open = false"
      />
    </Teleport>
    <Transition name="global-create">
      <section
        v-if="open"
        class="global-create__menu"
        role="menu"
        :aria-label="$t('shell.createMenu')"
      >
        <header class="global-create__header">
          <span>{{ $t('shell.createSomething') }}</span>
          <kbd>N</kbd>
        </header>
        <button
          v-for="action in actions"
          :key="action.id"
          class="global-create__action"
          :class="{ 'global-create__action--accent': action.accent }"
          role="menuitem"
          @click="select(action.id)"
        >
          <span class="global-create__icon"><UIcon :name="action.icon" /></span>
          <span
            ><strong>{{ $t(`shell.createActions.${action.id}.title`) }}</strong
            ><small>{{ $t(`shell.createActions.${action.id}.hint`) }}</small></span
          >
          <UIcon
            v-if="lastAction === action.id"
            name="i-lucide-clock-3"
            class="global-create__recent"
          />
        </button>
      </section>
    </Transition>
  </div>
</template>

<style scoped src="~/presentation/assets/css/components/shell/global-create-menu.css"></style>
