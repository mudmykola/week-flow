<script setup lang="ts">
export type NotesView = 'today' | 'pinned' | 'all' | 'archive'

const props = defineProps<{ view: NotesView; query: string; counts: Record<NotesView, number> }>()
const emit = defineEmits<{ view: [value: NotesView]; query: [value: string] }>()
const searchMenu = ref<HTMLDetailsElement | null>(null)
const viewMenu = ref<HTMLDetailsElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const views: Array<{ id: NotesView; icon: string }> = [
  { id: 'today', icon: 'i-lucide-calendar-days' },
  { id: 'pinned', icon: 'i-lucide-pin' },
  { id: 'all', icon: 'i-lucide-layout-grid' },
  { id: 'archive', icon: 'i-lucide-archive' }
]
const activeView = computed(() => views.find((item) => item.id === props.view) ?? views[0]!)

function toggleSearch(event: Event) {
  const details = event.currentTarget as HTMLDetailsElement
  if (details.open) nextTick(() => searchInput.value?.focus())
}

function selectView(view: NotesView) {
  emit('view', view)
  if (viewMenu.value) viewMenu.value.open = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (searchMenu.value) searchMenu.value.open = false
  if (viewMenu.value) viewMenu.value.open = false
}
</script>

<template>
  <section
    class="notes-toolbar"
    @keydown="onKeydown"
  >
    <details
      ref="viewMenu"
      class="notes-toolbar__dropdown"
    >
      <summary class="notes-toolbar__view-trigger">
        <UIcon :name="activeView.icon" />
        <span>{{ $t(`pages.notes.views.${activeView.id}`) }}</span>
        <SemanticBadge
          tone="neutral"
          size="sm"
          >{{ counts[activeView.id] }}</SemanticBadge
        >
        <UIcon
          name="i-lucide-chevron-down"
          class="notes-toolbar__chevron"
        />
      </summary>
      <div class="notes-toolbar__view-menu">
        <button
          v-for="item in views"
          :key="item.id"
          type="button"
          :class="{ 'notes-toolbar__view--active': view === item.id }"
          @click="selectView(item.id)"
        >
          <UIcon :name="item.icon" /><span>{{ $t(`pages.notes.views.${item.id}`) }}</span
          ><small>{{ counts[item.id] }}</small
          ><UIcon
            v-if="view === item.id"
            name="i-lucide-check"
          />
        </button>
      </div>
    </details>

    <details
      ref="searchMenu"
      class="notes-toolbar__search"
      @toggle="toggleSearch"
    >
      <summary
        class="notes-toolbar__search-trigger"
        :aria-label="$t('pages.notes.search')"
      >
        <UIcon name="i-lucide-search" />
        <span
          v-if="query"
          class="notes-toolbar__search-indicator"
        />
      </summary>
      <div class="notes-toolbar__search-popover">
        <UIcon name="i-lucide-search" />
        <input
          ref="searchInput"
          :value="query"
          :placeholder="$t('pages.notes.search')"
          @input="emit('query', ($event.target as HTMLInputElement).value)"
        />
        <IconButton
          v-if="query"
          icon="i-lucide-x"
          :label="$t('common.clear')"
          variant="ghost"
          size="sm"
          @click="emit('query', '')"
        />
      </div>
    </details>
  </section>
</template>

<style scoped>
.notes-toolbar {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 0.4rem;
}
.notes-toolbar__dropdown,
.notes-toolbar__search {
  position: relative;
}
.notes-toolbar summary {
  cursor: pointer;
  list-style: none;
}
.notes-toolbar summary::-webkit-details-marker {
  display: none;
}
.notes-toolbar__view-trigger,
.notes-toolbar__search-trigger {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.7rem;
  background: var(--color-panel-bg);
  color: var(--color-text-secondary);
}
.notes-toolbar__view-trigger {
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 650;
}
.notes-toolbar__search-trigger {
  position: relative;
  width: 2.5rem;
  justify-content: center;
}
.notes-toolbar__view-trigger:hover,
.notes-toolbar__search-trigger:hover {
  color: var(--color-text-primary);
  border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-panel-border));
}
.notes-toolbar__chevron {
  margin-left: 0.1rem;
  transition: transform 0.15s;
}
.notes-toolbar__dropdown[open] .notes-toolbar__chevron {
  transform: rotate(180deg);
}
.notes-toolbar__view-menu,
.notes-toolbar__search-popover {
  position: absolute;
  top: calc(100% + 0.45rem);
  z-index: 35;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  background: var(--color-panel-bg);
  box-shadow: 0 16px 42px rgb(0 0 0 / 0.28);
}
.notes-toolbar__view-menu {
  left: 0;
  display: grid;
  width: 13rem;
  padding: 0.35rem;
}
.notes-toolbar__view-menu button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.6rem;
  border-radius: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-align: left;
}
.notes-toolbar__view-menu button:hover,
.notes-toolbar__view-menu .notes-toolbar__view--active {
  background: var(--color-bg-alt);
  color: var(--color-text-primary);
}
.notes-toolbar__view-menu small {
  font-size: 0.65rem;
}
.notes-toolbar__search-popover {
  right: 0;
  display: flex;
  width: min(22rem, calc(100vw - 2rem));
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
}
.notes-toolbar__search-popover input {
  min-width: 0;
  flex: 1;
  background: transparent;
  font-size: 0.78rem;
  outline: none;
}
.notes-toolbar__search-indicator {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: var(--color-accent);
}
@media (max-width: 639px) {
  .notes-toolbar__view-trigger > span {
    max-width: 7rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notes-toolbar__search-popover {
    position: fixed;
    top: 5rem;
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
  }
}
</style>
