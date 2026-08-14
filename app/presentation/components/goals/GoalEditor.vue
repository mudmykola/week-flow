<script setup lang="ts">
import type { Goal, GoalPriority, GoalStatus, UpdateGoalInput } from '~/domain/entities/goal'

const props = defineProps<{
  open: boolean
  goal: Goal | null
  members: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
  saving?: boolean
}>()
const emit = defineEmits<{
  close: []
  save: [patch: UpdateGoalInput]
  duplicate: []
  delete: []
}>()

const form = reactive({
  title: '',
  description: '',
  assigneeId: null as string | null,
  dueDate: '',
  priority: 'medium' as GoalPriority,
  labels: '',
  status: 'active' as GoalStatus,
  projectId: null as string | null
})

watch(
  () => props.goal,
  (goal) => {
    if (!goal) return
    Object.assign(form, {
      title: goal.title,
      description: goal.description ?? '',
      assigneeId: goal.assigneeId,
      dueDate: goal.dueDate ?? '',
      priority: goal.priority,
      labels: goal.labels.join(', '),
      status: goal.status,
      projectId: goal.projectId
    })
  },
  { immediate: true }
)

function submit() {
  if (form.title.trim().length < 2) return
  emit('save', {
    title: form.title.trim(),
    description: form.description.trim() || null,
    assigneeId: form.assigneeId,
    dueDate: form.dueDate || null,
    priority: form.priority,
    labels: form.labels
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 8),
    status: form.status,
    projectId: form.projectId
  })
}
</script>

<template>
  <Modal
    class="goal-editor"
    :open="open"
    :title="$t('pages.team.editGoal')"
    @close="emit('close')"
  >
    <form
      class="goal-editor space-y-4"
      @submit.prevent="submit"
    >
      <FormField :label="$t('pages.team.goalName')">
        <FormInput v-model="form.title" />
      </FormField>
      <FormField :label="$t('pages.team.expected')">
        <FormTextarea
          v-model="form.description"
          :rows="4"
        />
      </FormField>
      <div class="grid gap-3 sm:grid-cols-2">
        <FormField :label="$t('pages.team.assignee')">
          <FormSelect v-model="form.assigneeId">
            <option :value="null">{{ $t('pages.team.teamGoal') }}</option>
            <option
              v-for="member in members"
              :key="member.id"
              :value="member.id"
            >
              {{ member.name }}
            </option>
          </FormSelect>
        </FormField>
        <FormField :label="$t('pages.team.priority')">
          <FormSelect v-model="form.priority">
            <option value="low">{{ $t('task.priorityValue.low') }}</option>
            <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
            <option value="high">{{ $t('task.priorityValue.high') }}</option>
          </FormSelect>
        </FormField>
        <FormField :label="$t('pages.team.deadline')">
          <FormInput
            v-model="form.dueDate"
            type="date"
          />
        </FormField>
        <FormField :label="$t('common.status')">
          <FormSelect v-model="form.status">
            <option value="active">{{ $t('pages.goals.activeSection') }}</option>
            <option value="done">{{ $t('pages.goals.completedSection') }}</option>
          </FormSelect>
        </FormField>
        <FormField :label="$t('common.project')">
          <FormSelect v-model="form.projectId">
            <option :value="null">{{ $t('pages.team.noLinkedProject') }}</option>
            <option
              v-for="project in projects"
              :key="project.id"
              :value="project.id"
            >
              {{ project.name }}
            </option>
          </FormSelect>
        </FormField>
        <FormField
          :label="$t('pages.team.labels')"
          :hint="$t('pages.team.labelsHint')"
        >
          <FormInput v-model="form.labels" />
        </FormField>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-panel-border)] pt-4">
        <div class="flex gap-2">
          <UButton
            type="button"
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            @click="emit('delete')"
            >{{ $t('common.delete') }}</UButton
          >
          <UButton
            type="button"
            variant="soft"
            icon="i-lucide-copy"
            @click="emit('duplicate')"
            >{{ $t('common.duplicate') }}</UButton
          >
        </div>
        <div class="flex gap-2">
          <UButton
            type="button"
            variant="ghost"
            @click="emit('close')"
            >{{ $t('common.cancel') }}</UButton
          >
          <UButton
            type="submit"
            :loading="saving"
            icon="i-lucide-save"
            >{{ $t('common.save') }}</UButton
          >
        </div>
      </div>
    </form>
  </Modal>
</template>
