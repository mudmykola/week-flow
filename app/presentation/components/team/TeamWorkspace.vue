<script setup lang="ts">
import { bulkUpdateGoals, deleteGoal, duplicateGoal, updateGoal } from '~/data/repositories/goalsRepository'
import type { Goal, GoalPriority, UpdateGoalInput } from '~/domain/entities/goal'
import type { TeamWorkspaceData } from '~/domain/entities/team'

const { user } = useUserSession()
const { t } = useI18n()
if (user.value?.role !== 'pm' && user.value?.role !== 'admin')
  throw createError({ statusCode: 403, statusMessage: t('pages.team.forbidden') })

const toast = useToast()
const { report } = useApiFeedback()
const projectsStore = useProjectsStore()
const goalsStore = useGoalsStore()
const selectedTeamId = ref<string | null>(null)
const { data, status, refresh } = await useFetch<TeamWorkspaceData>('/api/team', {
  query: computed(() => ({ team: selectedTeamId.value || undefined }))
})
useLiveRefresh('goals', refresh)
useLiveRefresh('tasks', refresh)

const teamName = ref(t('pages.team.defaultName'))
const memberEmail = ref('')
const goal = reactive({
  title: '',
  description: '',
  assigneeId: null as string | null,
  dueDate: '',
  priority: 'medium' as GoalPriority,
  labelsInput: ''
})
const saving = ref(false)
const editingGoal = ref<Goal | null>(null)
const selectedGoalIds = ref<string[]>([])
const bulkSaving = ref(false)
const bulkDeadline = ref('')
const confirmDeleteIds = ref<string[]>([])
const goalAssignees = computed(() => {
  const members = data.value?.members ?? []
  if (!user.value || members.some((member) => member.id === user.value?.id)) return members
  return [
    { id: user.value.id, name: user.value.name, email: user.value.email, avatarUrl: user.value.avatarUrl },
    ...members
  ]
})

function goalAssigneeName(assigneeId: string | null) {
  if (!assigneeId) return t('pages.team.teamGoal')
  if (assigneeId === user.value?.id) return t('pages.team.me')
  return data.value?.members.find((member) => member.id === assigneeId)?.name ?? t('pages.team.teamGoal')
}

onMounted(() => {
  if (!projectsStore.projects.length) void projectsStore.loadProjects()
})

async function createTeam() {
  saving.value = true
  try {
    await $fetch('/api/team', { method: 'POST', body: { name: teamName.value } })
    await refresh()
  } finally {
    saving.value = false
  }
}

async function addMember() {
  if (!memberEmail.value.trim()) return
  try {
    await $fetch('/api/team/members', {
      method: 'POST',
      body: { email: memberEmail.value, teamId: data.value?.team?.id }
    })
    memberEmail.value = ''
    await refresh()
    toast.add({ title: t('pages.team.memberAdded'), color: 'success' })
  } catch (error) {
    report(error, t('pages.team.addFailed'))
  }
}

async function removeMember(id: string) {
  await $fetch(`/api/team/members/${id}`, { method: 'DELETE', query: { team: data.value?.team?.id } })
  await refresh()
}

async function createGoal() {
  if (!goal.title.trim()) return
  saving.value = true
  try {
    await goalsStore.addGoal(
      {
        title: goal.title,
        description: goal.description,
        assigneeId: goal.assigneeId,
        dueDate: goal.dueDate || null,
        priority: goal.priority,
        labels: goal.labelsInput
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
        teamId: data.value?.team?.id
      },
      user.value?.id
    )
    Object.assign(goal, {
      title: '',
      description: '',
      assigneeId: null,
      dueDate: '',
      priority: 'medium',
      labelsInput: ''
    })
    await refresh()
    toast.add({ title: t('pages.team.goalCreated'), color: 'success' })
  } catch (error) {
    report(error, t('pages.team.goalCreateFailed'))
  } finally {
    saving.value = false
  }
}

async function setProgress(id: string, progress: number) {
  await updateGoal(id, { progress })
  await refresh()
}

async function linkProject(id: string, projectId: string | null) {
  await updateGoal(id, { projectId })
  await refresh()
}

async function syncGoals() {
  await Promise.all([refresh(), goalsStore.loadGoals()])
  broadcastSync('goals')
}

async function saveEditedGoal(patch: UpdateGoalInput) {
  if (!editingGoal.value) return
  saving.value = true
  try {
    await updateGoal(editingGoal.value.id, patch)
    editingGoal.value = null
    await syncGoals()
    toast.add({ title: t('pages.team.goalUpdated'), color: 'success' })
  } catch (error) {
    report(error, t('pages.team.goalUpdateFailed'))
  } finally {
    saving.value = false
  }
}

async function duplicateEditedGoal() {
  if (!editingGoal.value) return
  await duplicateGoal(editingGoal.value.id)
  editingGoal.value = null
  await syncGoals()
  toast.add({ title: t('pages.team.goalDuplicated'), color: 'success' })
}

function requestDelete(ids: string[]) {
  confirmDeleteIds.value = [...ids]
}

async function confirmDelete() {
  const ids = [...confirmDeleteIds.value]
  if (!ids.length) return
  bulkSaving.value = true
  try {
    for (const id of ids) await deleteGoal(id)
    confirmDeleteIds.value = []
    selectedGoalIds.value = selectedGoalIds.value.filter((id) => !ids.includes(id))
    if (editingGoal.value && ids.includes(editingGoal.value.id)) editingGoal.value = null
    await syncGoals()
    toast.add({ title: t('pages.team.goalsDeleted', { count: ids.length }), color: 'success' })
  } catch (error) {
    report(error, t('pages.team.goalDeleteFailed'))
  } finally {
    bulkSaving.value = false
  }
}

async function applyBulk(patch: UpdateGoalInput) {
  if (!selectedGoalIds.value.length) return
  bulkSaving.value = true
  try {
    await bulkUpdateGoals(selectedGoalIds.value, patch)
    await syncGoals()
    toast.add({ title: t('pages.team.bulkUpdated'), color: 'success' })
  } catch (error) {
    report(error, t('pages.team.bulkFailed'))
  } finally {
    bulkSaving.value = false
  }
}

function toggleAllGoals() {
  selectedGoalIds.value =
    selectedGoalIds.value.length === (data.value?.goals.length ?? 0)
      ? []
      : (data.value?.goals.map((item) => item.id) ?? [])
}
</script>

<template>
  <div class="team-workspace team-page app-container">
    <PageHeader
      :title="$t('nav.team')"
      :description="$t('pages.team.description')"
      icon="i-lucide-users-round"
    >
      <template #actions>
        <AppButton
          variant="ghost"
          icon="i-lucide-git-pull-request-arrow"
          @click="navigateTo('/delegation')"
        >
          {{ $t('nav.delegation') }}
        </AppButton>
        <AppButton
          variant="ghost"
          icon="i-lucide-workflow"
          @click="navigateTo('/workflows')"
        >
          {{ $t('nav.workflows') }}
        </AppButton>
        <select
          v-if="user?.role === 'admin' && data?.teams?.length"
          v-model="selectedTeamId"
          :aria-label="$t('pages.team.select')"
          class="h-10 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 text-sm"
        >
          <option :value="null">{{ data.teams[0]?.name }}</option>
          <option
            v-for="team in data.teams"
            :key="team.id"
            :value="team.id"
          >
            {{ team.name }} · {{ team.managerName }}
          </option>
        </select>
      </template>
    </PageHeader>
    <USkeleton
      v-if="status === 'pending'"
      class="h-64 rounded-xl"
    />
    <section
      v-else-if="!data?.team"
      class="surface-card mx-auto max-w-lg p-5 text-center"
    >
      <span class="page-icon mx-auto"><UIcon name="i-lucide-users-round" /></span>
      <h2 class="font-display mt-3 text-lg">{{ $t('pages.team.createTitle') }}</h2>
      <p class="text-secondary mt-1 text-sm">{{ $t('pages.team.createHint') }}</p>
      <div class="mt-4 flex gap-2">
        <input
          v-model="teamName"
          class="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
        /><UButton
          :loading="saving"
          @click="createTeam"
          >{{ $t('common.create') }}</UButton
        >
      </div>
    </section>
    <template v-else>
      <TeamOverview
        :members="data.members.length"
        :metrics="data.metrics"
      />
      <section class="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_22rem]">
        <div class="space-y-3">
          <TeamMembersPanel
            v-model:email="memberEmail"
            :team-name="data.team.name"
            :members="data.members"
            :current-user-id="user?.id"
            @add="addMember"
            @remove="removeMember"
          />
          <TeamGoalsPanel
            v-model:selected-ids="selectedGoalIds"
            v-model:bulk-deadline="bulkDeadline"
            :goals="data.goals"
            :assignees="goalAssignees"
            :projects="projectsStore.projects"
            :bulk-saving="bulkSaving"
            :assignee-name="goalAssigneeName"
            @toggle-all="toggleAllGoals"
            @bulk="applyBulk"
            @delete-selected="requestDelete(selectedGoalIds)"
            @edit="editingGoal = $event"
            @duplicate="duplicateGoal($event).then(syncGoals)"
            @progress="setProgress"
            @link-project="linkProject"
          />
        </div>
        <TeamGoalComposer
          :draft="goal"
          :assignees="goalAssignees"
          :current-user-id="user?.id"
          :saving="saving"
          @create="createGoal"
        />
      </section>
    </template>
    <GoalEditor
      :open="Boolean(editingGoal)"
      :goal="editingGoal"
      :members="goalAssignees"
      :projects="projectsStore.projects"
      :saving="saving"
      @close="editingGoal = null"
      @save="saveEditedGoal"
      @duplicate="duplicateEditedGoal"
      @delete="editingGoal && requestDelete([editingGoal.id])"
    />
    <Modal
      :open="Boolean(confirmDeleteIds.length)"
      :title="$t('pages.team.deleteGoalsTitle')"
      size="sm"
      @close="confirmDeleteIds = []"
    >
      <p class="text-secondary text-sm">
        {{ $t('pages.team.deleteGoalsConfirm', { count: confirmDeleteIds.length }) }}
      </p>
      <template #footer>
        <UButton
          variant="ghost"
          @click="confirmDeleteIds = []"
          >{{ $t('common.cancel') }}</UButton
        >
        <UButton
          color="error"
          :loading="bulkSaving"
          icon="i-lucide-trash-2"
          @click="confirmDelete"
          >{{ $t('common.delete') }}</UButton
        >
      </template>
    </Modal>
  </div>
</template>
