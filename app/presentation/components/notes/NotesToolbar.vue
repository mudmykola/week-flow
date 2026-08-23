<script setup lang="ts">
export type NotesView = 'today' | 'pinned' | 'all' | 'archive'

defineProps<{ view: NotesView; query: string; counts: Record<NotesView, number> }>()
const emit = defineEmits<{ view: [value: NotesView]; query: [value: string] }>()
const views: Array<{ id: NotesView; icon: string }> = [
  { id: 'today', icon: 'i-lucide-calendar-days' },
  { id: 'pinned', icon: 'i-lucide-pin' },
  { id: 'all', icon: 'i-lucide-layout-grid' },
  { id: 'archive', icon: 'i-lucide-archive' }
]
</script>

<template>
  <section class="notes-toolbar surface-card flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
    <nav
      class="notes-toolbar__views flex min-w-0 gap-1 overflow-x-auto"
      :aria-label="$t('pages.notes.views.label')"
    >
      <AppButton
        v-for="item in views"
        :key="item.id"
        :variant="view === item.id ? 'secondary' : 'ghost'"
        :icon="item.icon"
        size="sm"
        @click="emit('view', item.id)"
      >
        {{ $t(`pages.notes.views.${item.id}`) }}
        <SemanticBadge
          tone="neutral"
          size="sm"
          >{{ counts[item.id] }}</SemanticBadge
        >
      </AppButton>
    </nav>
    <FormInput
      class="notes-toolbar__search lg:ml-auto lg:w-80"
      :model-value="query"
      icon="i-lucide-search"
      :placeholder="$t('pages.notes.search')"
      @update:model-value="emit('query', String($event))"
    />
  </section>
</template>
