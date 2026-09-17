<script setup lang="ts">
import type { WorkflowTab } from '~/domain/entities/workflow'

defineProps<{ activeTab: WorkflowTab; saving: boolean; projectId: string | null }>()
const emit = defineEmits<{
  'update:activeTab': [value: WorkflowTab]
  import: [event: Event]
  export: []
}>()
const importInput = useTemplateRef<HTMLInputElement>('importInput')

const tabs: Array<{ id: WorkflowTab; icon: string }> = [
  { id: 'stages', icon: 'i-lucide-columns-3' },
  { id: 'automations', icon: 'i-lucide-zap' },
  { id: 'history', icon: 'i-lucide-history' },
  { id: 'metrics', icon: 'i-lucide-chart-no-axes-combined' }
]
</script>

<template>
  <nav
    class="workflow-toolbar workflows-page__tabs surface-card mb-3 flex gap-1 overflow-x-auto p-1"
    :aria-label="$t('pages.workflows.sections')"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="ui-button ui-button--sm whitespace-nowrap"
      :class="activeTab === tab.id ? 'ui-button--primary' : 'ui-button--ghost'"
      @click="emit('update:activeTab', tab.id)"
    >
      <UIcon :name="tab.icon" />{{ $t(`pages.workflows.tabs.${tab.id}`) }}
    </button>
    <span class="flex-1" />
    <input
      ref="importInput"
      class="sr-only"
      type="file"
      accept="application/json,.json"
      @change="emit('import', $event)"
    />
    <IconButton
      icon="i-lucide-upload"
      :label="$t('pages.workflows.import')"
      :disabled="saving || !projectId"
      @click="importInput?.click()"
    />
    <IconButton
      icon="i-lucide-download"
      :label="$t('pages.workflows.export')"
      @click="emit('export')"
    />
  </nav>
</template>
