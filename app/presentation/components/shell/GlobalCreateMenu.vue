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

<style scoped>
.global-create {
  position: relative;
}
.global-create__trigger {
  display: flex;
  overflow: hidden;
  border-radius: 999px;
  color: white;
  background: var(--color-accent);
  box-shadow: 0 8px 22px rgb(254 80 17 / 0.2);
}
.global-create__primary,
.global-create__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    transform 0.15s;
}
.global-create__primary {
  gap: 0.45rem;
  padding: 0.55rem 0.8rem 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
}
.global-create__toggle {
  width: 2.15rem;
  border-left: 1px solid rgb(255 255 255 / 0.25);
}
.global-create__primary:hover,
.global-create__toggle:hover {
  background: rgb(0 0 0 / 0.08);
}
.global-create__primary:active,
.global-create__toggle:active {
  transform: scale(0.97);
}
.global-create__menu {
  position: absolute;
  z-index: 61;
  top: calc(100% + 0.65rem);
  right: 0;
  width: 20rem;
  padding: 0.45rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 1.1rem;
  background: var(--color-panel-bg);
  box-shadow: 0 24px 70px rgb(0 0 0 / 0.24);
}
.global-create__header {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.7rem 0.45rem;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.global-create__header kbd {
  border: 1px solid var(--color-panel-border);
  border-radius: 0.35rem;
  padding: 0.05rem 0.35rem;
}
.global-create__action {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.6rem;
  border-radius: 0.8rem;
  text-align: left;
}
.global-create__action:hover {
  background: rgb(127 127 127 / 0.08);
}
.global-create__icon {
  display: grid;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border-radius: 0.7rem;
  background: rgb(127 127 127 / 0.09);
  color: var(--color-text-secondary);
}
.global-create__action--accent .global-create__icon {
  background: rgb(254 80 17 / 0.12);
  color: var(--color-accent);
}
.global-create__action strong,
.global-create__action small {
  display: block;
}
.global-create__action strong {
  font-size: 0.84rem;
}
.global-create__action small {
  margin-top: 0.08rem;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}
.global-create__recent {
  color: var(--color-accent);
}
.global-create__backdrop {
  display: none;
}
.global-create-enter-active,
.global-create-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
  transform-origin: top right;
}
.global-create-enter-from,
.global-create-leave-to {
  opacity: 0;
  transform: translateY(-0.3rem) scale(0.98);
}
@media (max-width: 639px) {
  .global-create__primary span {
    display: none;
  }
  .global-create__primary {
    padding: 0.65rem 0.7rem 0.65rem 0.8rem;
  }
  .global-create__backdrop {
    display: block;
    position: fixed;
    z-index: 59;
    inset: 0;
    background: rgb(0 0 0 / 0.48);
    backdrop-filter: blur(2px);
  }
  .global-create__menu {
    position: fixed;
    z-index: 60;
    top: auto;
    right: 0.6rem;
    bottom: 0.6rem;
    left: 0.6rem;
    width: auto;
    padding: 0.6rem;
    border-radius: 1.4rem;
  }
  .global-create__action {
    padding: 0.65rem;
  }
  .global-create-enter-active,
  .global-create-leave-active {
    transform-origin: bottom center;
  }
  .global-create-enter-from,
  .global-create-leave-to {
    transform: translateY(1rem);
  }
}
</style>
