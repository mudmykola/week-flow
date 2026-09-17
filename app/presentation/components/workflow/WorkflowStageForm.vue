<script setup lang="ts">
import type { WorkflowStageDraft } from '~/domain/entities/workflow'

defineProps<{ form: WorkflowStageDraft; editing: boolean; saving: boolean }>()
defineEmits<{ cancel: []; save: [] }>()
</script>

<template>
  <form
    class="workflow-stage-form workflow-form"
    @submit.prevent="$emit('save')"
  >
    <h3 class="workflow-form__title">
      {{ editing ? $t('pages.workflows.editStage') : $t('pages.workflows.newStage') }}
    </h3>
    <div class="workflow-form__grid">
      <FormInput
        v-model="form.name"
        required
        :placeholder="$t('pages.workflows.stageName')"
      />
      <FormSelect v-model="form.category">
        <option value="todo">{{ $t('pages.workflows.todo') }}</option>
        <option value="in_progress">{{ $t('pages.workflows.inProgress') }}</option>
        <option value="done">{{ $t('common.done') }}</option>
      </FormSelect>
      <FormInput
        v-model="form.color"
        type="color"
        class="workflow-form__color"
      />
      <FormInput
        v-model="form.wipLimit"
        type="number"
        min="1"
        placeholder="WIP"
      />
      <FormSelect v-model="form.wipPolicy">
        <option value="warn">{{ $t('pages.workflows.wipPolicy.warn') }}</option>
        <option value="block">{{ $t('pages.workflows.wipPolicy.block') }}</option>
      </FormSelect>
    </div>
    <div class="workflow-form__actions">
      <AppButton
        v-if="editing"
        type="button"
        variant="ghost"
        @click="$emit('cancel')"
      >
        {{ $t('common.cancel') }}
      </AppButton>
      <AppButton
        type="submit"
        variant="primary"
        icon="i-lucide-save"
        :loading="saving"
      >
        {{ editing ? $t('common.save') : $t('common.add') }}
      </AppButton>
    </div>
  </form>
</template>
