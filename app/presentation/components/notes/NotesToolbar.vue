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

<style scoped src="~/presentation/assets/css/components/notes/notes-toolbar.css"></style>
