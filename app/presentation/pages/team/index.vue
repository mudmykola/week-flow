<script setup lang="ts">
import { createTeamGoal, updateGoal } from '~/data/repositories/goalsRepository'

const { user } = useUserSession()
const { t } = useI18n()
if (user.value?.role !== 'pm' && user.value?.role !== 'admin')
  throw createError({ statusCode: 403, statusMessage: t('pages.team.forbidden') })

const toast = useToast()
const { report } = useApiFeedback()
const projectsStore = useProjectsStore()
const selectedTeamId = ref<string | null>(null)
const { data, status, refresh } = await useFetch('/api/team', {
  query: computed(() => ({ team: selectedTeamId.value || undefined }))
})
useLiveRefresh('goals', refresh)
useLiveRefresh('tasks', refresh)

const teamName = ref(t('pages.team.defaultName'))
const memberEmail = ref('')
const goal = reactive({ title: '', description: '', assigneeId: null as string | null, dueDate: '' })
const saving = ref(false)

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
    await createTeamGoal({ ...goal, dueDate: goal.dueDate || null, teamId: data.value?.team?.id })
    Object.assign(goal, { title: '', description: '', assigneeId: null, dueDate: '' })
    await refresh()
    toast.add({ title: t('pages.team.goalCreated'), color: 'success' })
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
            <h2 class="font-display mb-3">{{ $t('pages.team.goals') }}</h2>
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
                class="rounded-lg border border-[var(--color-panel-border)] p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold">{{ item.title }}</p>
                    <p class="text-secondary mt-0.5 text-xs">
                      {{
                        data.members.find((member) => member.id === item.assigneeId)?.name || $t('pages.team.teamGoal')
                      }}<span v-if="item.dueDate"> · {{ $t('pages.team.due', { date: item.dueDate }) }}</span>
                    </p>
                  </div>
                  <strong class="text-sm text-[var(--color-accent)]">{{ item.progress }}%</strong>
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
                v-for="member in data.members"
                :key="member.id"
                :value="member.id"
              >
                {{ member.name }}
              </option></select
            ><input
              v-model="goal.dueDate"
              type="date"
              class="h-10 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3"
            /><UButton
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
  </div>
</template>
