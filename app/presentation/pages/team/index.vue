<script setup lang="ts">
import { bulkUpdateGoals, deleteGoal, duplicateGoal, updateGoal } from '~/data/repositories/goalsRepository'
import type { Goal, GoalPriority, UpdateGoalInput } from '~/domain/entities/goal'

const { user } = useUserSession()
const { t } = useI18n()
if (user.value?.role !== 'pm' && user.value?.role !== 'admin')
  throw createError({ statusCode: 403, statusMessage: t('pages.team.forbidden') })

const toast = useToast()
const { report } = useApiFeedback()
const projectsStore = useProjectsStore()
const goalsStore = useGoalsStore()
const selectedTeamId = ref<string | null>(null)
const { data, status, refresh } = await useFetch('/api/team', {
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
  <div class="team-page app-container max-w-7xl">
    <PageHeader
      :title="$t('nav.team')"
      :description="$t('pages.team.description')"
      icon="i-lucide-users-round"
      ><template #actions
        ><select
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
        </select></template
      ></PageHeader
    >
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
      <section class="mb-3 grid gap-3 sm:grid-cols-3">
        <MetricCard
          :label="$t('pages.team.members')"
          :value="data.members.length"
          icon="i-lucide-users"
        /><MetricCard
          :label="$t('pages.team.tasksDone')"
          :value="`${data.metrics.done}/${data.metrics.tasks}`"
          icon="i-lucide-list-checks"
          tone="success"
        /><MetricCard
          :label="$t('pages.team.goalProgress')"
          :value="`${data.metrics.goalProgress}%`"
          icon="i-lucide-target"
        />
      </section>
      <section class="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_22rem]">
        <div class="space-y-3">
          <article class="section-card">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="font-display">{{ data.team.name }}</h2>
                <p class="text-secondary text-xs">{{ $t('pages.team.memberProgress') }}</p>
              </div>
              <form
                class="flex gap-2"
                @submit.prevent="addMember"
              >
                <input
                  v-model="memberEmail"
                  type="email"
                  class="h-9 rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 text-sm"
                  :placeholder="$t('pages.team.memberEmail')"
                /><UButton
                  size="sm"
                  type="submit"
                  icon="i-lucide-user-plus"
                  >{{ $t('common.add') }}</UButton
                >
              </form>
            </div>
            <div class="divide-y divide-[var(--color-panel-border)]">
              <div
                v-for="member in data.members"
                :key="member.id"
                class="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_6rem_auto]"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <NuxtImg
                    v-if="member.avatarUrl"
                    :src="member.avatarUrl"
                    width="32"
                    height="32"
                    class="size-8 rounded-full"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold">{{ member.name }}</p>
                    <p class="text-secondary truncate text-xs">{{ member.email }}</p>
                  </div>
                </div>
                <div>
                  <p class="text-secondary text-xs">{{ $t('pages.review.completed') }}</p>
                  <p class="text-sm font-semibold">{{ member.taskDone }}/{{ member.taskTotal }}</p>
                </div>
                <div>
                  <p class="text-secondary text-xs">{{ $t('pages.team.working') }}</p>
                  <p class="text-sm font-semibold">{{ member.taskActive }}</p>
                </div>
                <div>
                  <p class="text-secondary text-xs">{{ $t('nav.overdue') }}</p>
                  <p
                    class="text-sm font-semibold"
                    :class="member.taskOverdue ? 'text-[var(--color-danger)]' : ''"
                  >
                    {{ member.taskOverdue }}
                  </p>
                </div>
                <button
                  v-if="member.id !== user?.id"
                  class="text-secondary hover:text-[var(--color-danger)]"
                  :title="$t('pages.team.remove')"
                  @click="removeMember(member.id)"
                >
                  <UIcon name="i-lucide-user-minus" />
                </button>
              </div>
            </div>
          </article>
          <article class="section-card">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <input
                  v-if="data.goals.length"
                  type="checkbox"
                  :checked="selectedGoalIds.length === data.goals.length"
                  :aria-label="$t('pages.team.selectAllGoals')"
                  @change="toggleAllGoals"
                />
                <h2 class="font-display">{{ $t('pages.team.goals') }}</h2>
                <span class="count-badge">{{ data.goals.length }}</span>
              </div>
              <span
                v-if="selectedGoalIds.length"
                class="text-secondary text-xs"
                >{{ $t('pages.team.selectedGoals', { count: selectedGoalIds.length }) }}</span
              >
            </div>
            <div
              v-if="selectedGoalIds.length"
              class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-2"
            >
              <select
                class="h-9 min-w-36 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2 text-xs"
                :aria-label="$t('pages.team.bulkAssignee')"
                :disabled="bulkSaving"
                @change="
                  applyBulk({
                    assigneeId:
                      ($event.target as HTMLSelectElement).value === '__team__'
                        ? null
                        : ($event.target as HTMLSelectElement).value
                  })
                "
              >
                <option
                  value=""
                  disabled
                  selected
                >
                  {{ $t('pages.team.bulkAssignee') }}
                </option>
                <option value="__team__">{{ $t('pages.team.teamGoal') }}</option>
                <option
                  v-for="member in goalAssignees"
                  :key="member.id"
                  :value="member.id"
                >
                  {{ member.name }}
                </option>
              </select>
              <select
                class="h-9 min-w-32 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2 text-xs"
                :aria-label="$t('pages.team.priority')"
                :disabled="bulkSaving"
                @change="applyBulk({ priority: ($event.target as HTMLSelectElement).value as GoalPriority })"
              >
                <option
                  value=""
                  disabled
                  selected
                >
                  {{ $t('pages.team.priority') }}
                </option>
                <option value="low">{{ $t('task.priorityValue.low') }}</option>
                <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
                <option value="high">{{ $t('task.priorityValue.high') }}</option>
              </select>
              <UButton
                size="sm"
                variant="soft"
                icon="i-lucide-circle-check"
                :loading="bulkSaving"
                @click="applyBulk({ status: 'done' })"
                >{{ $t('common.done') }}</UButton
              >
              <div class="flex items-center gap-1">
                <input
                  v-model="bulkDeadline"
                  type="date"
                  class="h-9 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-2 text-xs"
                  :aria-label="$t('pages.team.deadline')"
                />
                <IconButton
                  icon="i-lucide-calendar-check"
                  :label="$t('pages.team.applyDeadline')"
                  size="sm"
                  :disabled="!bulkDeadline || bulkSaving"
                  @click="applyBulk({ dueDate: bulkDeadline })"
                />
              </div>
              <IconButton
                class="ml-auto"
                icon="i-lucide-trash-2"
                :label="$t('pages.team.deleteSelected')"
                variant="ghost"
                size="sm"
                @click="requestDelete(selectedGoalIds)"
              />
            </div>
            <EmptyState
              v-if="!data.goals.length"
              :title="$t('pages.team.goalsEmpty')"
              :description="$t('pages.team.goalsEmptyHint')"
              icon="i-lucide-target"
            />
            <div
              v-else
              class="space-y-2"
            >
              <div
                v-for="item in data.goals"
                :key="item.id"
                class="group rounded-lg border border-[var(--color-panel-border)] p-3 transition hover:border-[var(--color-accent)]/40"
              >
                <div class="flex items-start justify-between gap-3">
                  <input
                    v-model="selectedGoalIds"
                    type="checkbox"
                    :value="item.id"
                    :aria-label="$t('pages.team.selectGoal', { title: item.title })"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-semibold">{{ item.title }}</p>
                      <SemanticBadge
                        :tone="item.priority === 'high' ? 'danger' : item.priority === 'low' ? 'info' : 'warning'"
                        size="sm"
                        >{{ $t(`task.priorityValue.${item.priority}`) }}</SemanticBadge
                      >
                    </div>
                    <p class="text-secondary mt-0.5 text-xs">
                      {{ goalAssigneeName(item.assigneeId)
                      }}<span v-if="item.dueDate"> · {{ $t('pages.team.due', { date: item.dueDate }) }}</span>
                    </p>
                    <div
                      v-if="item.labels?.length"
                      class="mt-2 flex flex-wrap gap-1"
                    >
                      <SemanticBadge
                        v-for="label in item.labels"
                        :key="label"
                        tone="violet"
                        size="sm"
                        >{{ label }}</SemanticBadge
                      >
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <strong class="text-sm text-[var(--color-accent)]">{{ item.progress }}%</strong>
                    <IconButton
                      icon="i-lucide-pencil"
                      :label="$t('common.edit')"
                      variant="ghost"
                      size="sm"
                      @click="editingGoal = item"
                    />
                    <IconButton
                      icon="i-lucide-copy"
                      :label="$t('common.duplicate')"
                      variant="ghost"
                      size="sm"
                      @click="duplicateGoal(item.id).then(syncGoals)"
                    />
                  </div>
                </div>
                <div
                  v-if="item.projectId"
                  class="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]"
                >
                  <div
                    class="h-full rounded-full"
                    style="background-color: var(--color-accent)"
                    :style="{ width: `${item.progress}%` }"
                  />
                </div>
                <input
                  v-else
                  :value="item.progress"
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  class="mt-3 w-full accent-[var(--color-accent)]"
                  @change="setProgress(item.id, Number(($event.target as HTMLInputElement).value))"
                />
                <select
                  :value="item.projectId"
                  class="mt-2 h-8 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 text-xs"
                  @change="linkProject(item.id, ($event.target as HTMLSelectElement).value || null)"
                >
                  <option value="">{{ $t('pages.team.noLinkedProject') }}</option>
                  <option
                    v-for="project in projectsStore.projects"
                    :key="project.id"
                    :value="project.id"
                  >
                    {{ $t('pages.team.linkProject', { project: project.name }) }}
                  </option>
                </select>
              </div>
            </div>
          </article>
        </div>
        <aside class="section-card h-fit">
          <h2 class="font-display">{{ $t('pages.team.newGoal') }}</h2>
          <div class="mt-3 space-y-3">
            <input
              v-model="goal.title"
              class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
              :placeholder="$t('pages.team.goalName')"
            /><textarea
              v-model="goal.description"
              rows="3"
              class="w-full resize-none rounded-lg border border-[var(--color-panel-border)] bg-transparent p-3"
              :placeholder="$t('pages.team.expected')"
            /><select
              v-model="goal.assigneeId"
              class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
            >
              <option :value="null">{{ $t('pages.team.teamGoal') }}</option>
              <option
                v-for="member in goalAssignees"
                :key="member.id"
                :value="member.id"
              >
                {{ member.id === user?.id ? $t('pages.team.assignToMe', { name: member.name }) : member.name }}
              </option>
            </select>
            <div class="grid grid-cols-2 gap-2">
              <select
                v-model="goal.priority"
                class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
                :aria-label="$t('pages.team.priority')"
              >
                <option value="low">{{ $t('task.priorityValue.low') }}</option>
                <option value="medium">{{ $t('task.priorityValue.medium') }}</option>
                <option value="high">{{ $t('task.priorityValue.high') }}</option>
              </select>
              <input
                v-model="goal.dueDate"
                type="date"
                class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
                :aria-label="$t('pages.team.deadline')"
              />
            </div>
            <input
              v-model="goal.labelsInput"
              class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
              :placeholder="$t('pages.team.labelsPlaceholder')"
            />
            <p class="text-secondary text-xs">{{ $t('pages.team.labelsHint') }}</p>
            <UButton
              block
              :loading="saving"
              icon="i-lucide-target"
              @click="createGoal"
              >{{ $t('pages.team.createGoal') }}</UButton
            >
          </div>
        </aside>
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
