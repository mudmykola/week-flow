<script setup lang="ts">
import type { AssignableUser, TaskWorkState } from '~/domain/entities/task'

defineProps<{ assignees: AssignableUser[] }>()
const workState = defineModel<TaskWorkState>('workState', { required: true })
const waitingFor = defineModel<string>('waitingFor', { required: true })
const waitingUntil = defineModel<string>('waitingUntil', { required: true })
const reviewerId = defineModel<string | null>('reviewerId', { required: true })
const reviewNote = defineModel<string>('reviewNote', { required: true })
const actualMinutes = defineModel<number | null>('actualMinutes', { required: true })
const carryoverReason = defineModel<string>('carryoverReason', { required: true })
const readyCriteriaText = defineModel<string>('readyCriteriaText', { required: true })
const doneCriteriaText = defineModel<string>('doneCriteriaText', { required: true })
const reminderAt = defineModel<string>('reminderAt', { required: true })
</script>

<template>
  <section
    class="task-lifecycle-panel task-lifecycle space-y-3 rounded-2xl border border-[var(--color-panel-border)] p-4"
  >
    <h3 class="flex items-center gap-2 text-sm font-semibold">
      <UIcon name="i-lucide-route" />{{ $t('task.lifecycle') }}
    </h3>
    <FormField
      :label="$t('task.workState')"
      icon="i-lucide-git-pull-request-draft"
    >
      <FormSelect v-model="workState">
        <option value="active">{{ $t('task.workStateValue.active') }}</option>
        <option value="waiting">{{ $t('task.workStateValue.waiting') }}</option>
        <option value="review">{{ $t('task.workStateValue.review') }}</option>
        <option value="deferred">{{ $t('task.workStateValue.deferred') }}</option>
        <option value="cancelled">{{ $t('task.workStateValue.cancelled') }}</option>
      </FormSelect>
    </FormField>
    <template v-if="workState === 'waiting'">
      <FormField
        :label="$t('task.waitingFor')"
        icon="i-lucide-message-circle-question"
      >
        <FormInput
          v-model="waitingFor"
          :placeholder="$t('task.waitingForPlaceholder')"
        />
      </FormField>
      <FormField
        :label="$t('task.waitingUntil')"
        icon="i-lucide-calendar-clock"
      >
        <FormInput
          v-model="waitingUntil"
          type="date"
        />
      </FormField>
    </template>
    <template v-if="workState === 'review'">
      <FormField
        :label="$t('task.reviewer')"
        icon="i-lucide-scan-search"
      >
        <FormSelect v-model="reviewerId">
          <option :value="null">{{ $t('task.unassigned') }}</option>
          <option
            v-for="person in assignees"
            :key="person.id"
            :value="person.id"
          >
            {{ person.name }}
          </option>
        </FormSelect>
      </FormField>
      <FormField
        :label="$t('task.reviewNote')"
        icon="i-lucide-message-square-text"
      >
        <FormTextarea
          v-model="reviewNote"
          :rows="2"
        />
      </FormField>
    </template>
    <div class="grid grid-cols-2 gap-3">
      <FormField
        :label="$t('task.actualTime')"
        icon="i-lucide-timer"
      >
        <FormInput
          v-model="actualMinutes"
          type="number"
          min="0"
        />
      </FormField>
      <FormField
        :label="$t('task.reminder')"
        icon="i-lucide-bell-ring"
      >
        <FormInput
          v-model="reminderAt"
          type="datetime-local"
        />
      </FormField>
    </div>
    <FormField
      :label="$t('task.carryoverReason')"
      icon="i-lucide-forward"
    >
      <FormInput v-model="carryoverReason" />
    </FormField>
    <div class="grid gap-3 sm:grid-cols-2">
      <FormField
        :label="$t('task.readyCriteria')"
        icon="i-lucide-list-start"
      >
        <FormTextarea
          v-model="readyCriteriaText"
          :rows="4"
          :placeholder="$t('task.criteriaPlaceholder')"
        />
      </FormField>
      <FormField
        :label="$t('task.doneCriteria')"
        icon="i-lucide-list-checks"
      >
        <FormTextarea
          v-model="doneCriteriaText"
          :rows="4"
          :placeholder="$t('task.criteriaPlaceholder')"
        />
      </FormField>
    </div>
  </section>
</template>
