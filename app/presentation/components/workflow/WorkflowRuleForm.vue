<script setup lang="ts">
import type { AutomationRuleDraft } from '~/domain/entities/workflow'
import type { AssignableUser, TaskPriority } from '~/domain/entities/task'

defineProps<{
  form: AutomationRuleDraft
  editing: boolean
  saving: boolean
  assignees: AssignableUser[]
  priorities: TaskPriority[]
  reusableTags: string[]
  triggerLabel: string
  actionLabel: string
}>()
defineEmits<{ addAction: []; addCondition: []; cancel: []; save: [] }>()
</script>

<template>
  <form
    class="workflow-rule-form workflow-form"
    @submit.prevent="$emit('save')"
  >
    <h3 class="workflow-form__title">
      {{ editing ? $t('pages.workflows.editRule') : $t('pages.workflows.newRule') }}
    </h3>
    <div class="workflow-form__grid workflow-form__grid--rules">
      <FormInput
        v-model="form.name"
        required
        :placeholder="$t('pages.workflows.ruleName')"
      />
      <FormSelect v-model="form.trigger">
        <option value="task_created">{{ $t('pages.workflows.taskCreated') }}</option>
        <option value="status_changed">{{ $t('pages.workflows.statusChanged') }}</option>
      </FormSelect>
      <FormSelect
        v-if="form.trigger === 'status_changed'"
        v-model="form.triggerValue"
      >
        <option value="todo">{{ $t('pages.workflows.todo') }}</option>
        <option value="in_progress">{{ $t('pages.workflows.inProgress') }}</option>
        <option value="done">{{ $t('common.done') }}</option>
      </FormSelect>
      <FormSelect v-model="form.action">
        <option value="add_tag">{{ $t('pages.workflows.addTag') }}</option>
        <option value="set_priority">{{ $t('pages.workflows.setPriority') }}</option>
        <option value="assign_user">{{ $t('pages.workflows.assignUser') }}</option>
      </FormSelect>
      <FormSelect
        v-if="form.action === 'set_priority'"
        v-model="form.actionValue"
        required
      >
        <option
          disabled
          value=""
        >
          {{ $t('pages.workflows.choosePriority') }}
        </option>
        <option
          v-for="priority in priorities"
          :key="priority"
          :value="priority"
        >
          {{ $t(`task.priorityValue.${priority}`) }}
        </option>
      </FormSelect>
      <FormSelect
        v-else-if="form.action === 'assign_user'"
        v-model="form.actionValue"
        required
        :disabled="!assignees.length"
        :placeholder="assignees.length ? $t('pages.workflows.chooseAssignee') : $t('pages.workflows.noAssignees')"
      >
        <option
          v-for="user in assignees"
          :key="user.id"
          :value="user.id"
        >
          {{ user.name }} · {{ user.email }}
        </option>
      </FormSelect>
      <div v-else>
        <FormInput
          v-model="form.actionValue"
          required
          list="workflow-tags"
          :placeholder="$t('pages.workflows.chooseTag')"
        />
        <datalist id="workflow-tags">
          <option
            v-for="tag in reusableTags"
            :key="tag"
            :value="tag"
          />
        </datalist>
      </div>
    </div>

    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <section class="automation-builder">
        <header>
          <strong>{{ $t('pages.workflows.if') }}</strong>
          <IconButton
            icon="i-lucide-plus"
            :label="$t('pages.workflows.addCondition')"
            size="sm"
            @click="$emit('addCondition')"
          />
        </header>
        <div
          v-for="(condition, index) in form.conditions"
          :key="index"
          class="grid grid-cols-[1fr_1fr_1fr_auto] gap-1"
        >
          <FormSelect v-model="condition.field">
            <option value="priority">{{ $t('task.priority') }}</option>
            <option value="status">{{ $t('task.status') }}</option>
            <option value="tag">{{ $t('task.tags') }}</option>
            <option value="assigneeId">{{ $t('task.assignee') }}</option>
            <option value="stageId">{{ $t('task.workflowStage') }}</option>
          </FormSelect>
          <FormSelect v-model="condition.operator">
            <option value="equals">=</option>
            <option value="not_equals">≠</option>
            <option value="contains">∋</option>
          </FormSelect>
          <FormInput v-model="condition.value" />
          <IconButton
            icon="i-lucide-x"
            :label="$t('common.delete')"
            size="sm"
            @click="form.conditions.splice(index, 1)"
          />
        </div>
      </section>
      <section class="automation-builder">
        <header>
          <strong>{{ $t('pages.workflows.then') }}</strong>
          <IconButton
            icon="i-lucide-plus"
            :label="$t('pages.workflows.addAction')"
            size="sm"
            @click="$emit('addAction')"
          />
        </header>
        <div
          v-for="(action, index) in form.actions"
          :key="index"
          class="grid grid-cols-[1fr_1fr_auto] gap-1"
        >
          <FormSelect v-model="action.type">
            <option value="add_tag">{{ $t('pages.workflows.addTag') }}</option>
            <option value="remove_tag">{{ $t('pages.workflows.removeTag') }}</option>
            <option value="set_priority">{{ $t('pages.workflows.setPriority') }}</option>
            <option value="set_status">{{ $t('pages.workflows.setStatus') }}</option>
            <option value="set_stage">{{ $t('pages.workflows.setStage') }}</option>
            <option value="move_week">{{ $t('pages.workflows.moveWeek') }}</option>
            <option value="add_comment">{{ $t('pages.workflows.addComment') }}</option>
            <option value="create_subtask">{{ $t('pages.workflows.createSubtask') }}</option>
          </FormSelect>
          <FormInput v-model="action.value" />
          <IconButton
            icon="i-lucide-x"
            :label="$t('common.delete')"
            size="sm"
            @click="form.actions.splice(index, 1)"
          />
        </div>
      </section>
    </div>

    <div
      v-if="form.name && form.actionValue"
      class="automation-preview"
    >
      <UIcon name="i-lucide-eye" />
      <div>
        <span>{{ $t('pages.workflows.preview') }}</span>
        <p>
          <strong>{{ $t('pages.workflows.when') }}</strong> {{ triggerLabel }} →
          <strong>{{ $t('pages.workflows.then') }}</strong> {{ actionLabel }}
        </p>
      </div>
    </div>
    <div class="workflow-form__actions">
      <AppButton
        v-if="editing"
        type="button"
        variant="ghost"
        @click="$emit('cancel')"
        >{{ $t('common.cancel') }}</AppButton
      >
      <AppButton
        type="submit"
        variant="primary"
        icon="i-lucide-zap"
        :loading="saving"
      >
        {{ editing ? $t('common.save') : $t('pages.workflows.activate') }}
      </AppButton>
    </div>
  </form>
</template>
