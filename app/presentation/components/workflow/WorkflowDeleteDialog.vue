<script setup lang="ts">
import type { WorkflowDeleteTarget } from '~/domain/entities/workflow'

defineProps<{ target: WorkflowDeleteTarget; stageTaskCount: number }>()
defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template>
  <Modal
    class="workflow-delete-dialog"
    :open="Boolean(target)"
    :title="target?.type === 'stage' ? $t('pages.workflows.deleteStageTitle') : $t('pages.workflows.deleteRuleTitle')"
    size="sm"
    @close="$emit('cancel')"
  >
    <p class="text-secondary text-sm">
      {{
        target?.type === 'stage'
          ? $t('pages.workflows.deleteStageImpact', { name: target?.name, count: stageTaskCount })
          : $t('pages.workflows.deleteRuleImpact', { name: target?.name })
      }}
    </p>
    <template #footer>
      <AppButton
        variant="ghost"
        @click="$emit('cancel')"
        >{{ $t('common.cancel') }}</AppButton
      >
      <AppButton
        variant="danger"
        icon="i-lucide-trash-2"
        @click="$emit('confirm')"
        >{{ $t('common.delete') }}</AppButton
      >
    </template>
  </Modal>
</template>
