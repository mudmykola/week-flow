<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task } from '~/domain/entities/task'

const route = useRoute()
const { user } = useUserSession()
const { report } = useApiFeedback()
const { t } = useI18n()
const projectsStore = useProjectsStore()
const goalsStore = useGoalsStore()
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const selectedTask = ref<Task | null>(null)
const loading = ref(true)
const loadError = ref(false)

const projectId = computed(() => String(route.params.id))
const project = computed(() => projectsStore.getProject(projectId.value))
const projectTasks = computed(() =>
  tasks.value
    .filter((task) => task.projectId === projectId.value && !task.archivedAt)
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || b.createdAt - a.createdAt)
)
const projectGoals = computed(() => goalsStore.goals.filter((goal) => goal.projectId === projectId.value))
const doneCount = computed(() => projectTasks.value.filter((task) => task.status === 'done').length)
const activeCount = computed(() => projectTasks.value.length - doneCount.value)
const overdueCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return projectTasks.value.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length
})
const progress = computed(() =>
  projectTasks.value.length ? Math.round((doneCount.value / projectTasks.value.length) * 100) : 0
)
const canManageWorkflow = computed(() => user.value?.role === 'pm' || user.value?.role === 'admin')

onMounted(load)
useLiveRefresh('projects', load)
useLiveRefresh('tasks', load)
useLiveRefresh('goals', load)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([
      projectsStore.loadProjects(),
      goalsStore.loadGoals(),
      fetchAllTasks().then((items) => (tasks.value = items)),
      $fetch<AssignableUser[]>('/api/users/assignable').then((items) => (assignees.value = items))
    ])
  } catch (error) {
    loadError.value = true
    report(error, t('pages.projects.loadError'))
  } finally {
    loading.value = false
  }
}

function updateTask(task: Task) {
  tasks.value = tasks.value.map((item) => (item.id === task.id ? task : item))
  selectedTask.value = task
}
</script>

<template>
  <div class="projects-id-page project-page app-container">
    <USkeleton
      v-if="loading"
      class="h-[32rem] rounded-2xl"
    />

    <EmptyState
      v-else-if="loadError"
      :title="$t('pages.projects.loadError')"
      :description="$t('pages.projects.loadErrorHint')"
      icon="i-lucide-triangle-alert"
    >
      <AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!project"
      :title="$t('pages.projects.notFound')"
      :description="$t('pages.projects.notFoundHint')"
      icon="i-lucide-folder-search-2"
    >
      <AppButton @click="navigateTo('/projects')">{{ $t('pages.projects.back') }}</AppButton>
    </EmptyState>

    <template v-else>
      <PageHeader
        :title="project.name"
        :description="$t('pages.projects.workspaceDescription')"
        icon="i-lucide-folder-kanban"
      >
        <template #actions>
          <AppButton
            variant="ghost"
            icon="i-lucide-layout-dashboard"
            @click="navigateTo({ path: '/', query: { project: project.id } })"
          >
            {{ $t('pages.projects.openBoard') }}
          </AppButton>
          <AppButton
            v-if="canManageWorkflow"
            variant="ghost"
            icon="i-lucide-workflow"
            @click="navigateTo({ path: '/workflows', query: { projectId: project.id } })"
          >
            {{ $t('nav.workflows') }}
          </AppButton>
        </template>
      </PageHeader>

      <section class="project-page__metrics">
        <MetricCard
          :label="$t('pages.projects.active')"
          :value="activeCount"
          icon="i-lucide-list-todo"
        />
        <MetricCard
          :label="$t('pages.projects.completed')"
          :value="doneCount"
          icon="i-lucide-circle-check-big"
          tone="success"
        />
        <MetricCard
          :label="$t('pages.projects.overdue')"
          :value="overdueCount"
          icon="i-lucide-triangle-alert"
          :tone="overdueCount ? 'warning' : undefined"
        />
        <MetricCard
          :label="$t('pages.projects.progress')"
          :value="`${progress}%`"
          icon="i-lucide-chart-no-axes-column-increasing"
          tone="accent"
        />
      </section>

      <section class="project-page__layout">
        <AppSurface class="project-page__tasks">
          <header>
            <div>
              <h2>{{ $t('pages.projects.tasks') }}</h2>
              <p>{{ $t('pages.projects.tasksHint') }}</p>
            </div>
            <AppButton
              size="sm"
              icon="i-lucide-arrow-up-right"
              @click="navigateTo({ path: '/', query: { project: project.id } })"
            >
              {{ $t('pages.projects.allTasks') }}
            </AppButton>
          </header>
          <div
            v-if="projectTasks.length"
            class="project-page__task-list app-scrollbar"
          >
            <button
              v-for="task in projectTasks.slice(0, 10)"
              :key="task.id"
              type="button"
              @click="selectedTask = task"
            >
              <StatusBadge :status="task.status" />
              <span>
                <strong>{{ task.title }}</strong>
                <small>{{ task.dueDate || $t('task.noDate') }}</small>
              </span>
              <PriorityBadge :priority="task.priority" />
              <UIcon name="i-lucide-chevron-right" />
            </button>
          </div>
          <p
            v-else
            class="project-page__empty"
          >
            {{ $t('pages.projects.noTasks') }}
          </p>
        </AppSurface>

        <aside class="project-page__side">
          <AppSurface>
            <header>
              <div>
                <h2>{{ $t('pages.projects.goals') }}</h2>
                <p>{{ $t('pages.projects.goalsHint') }}</p>
              </div>
              <IconButton
                icon="i-lucide-arrow-up-right"
                :label="$t('nav.goals')"
                @click="navigateTo('/goals')"
              />
            </header>
            <div
              v-if="projectGoals.length"
              class="project-page__goals"
            >
              <div
                v-for="goal in projectGoals.slice(0, 5)"
                :key="goal.id"
              >
                <span>{{ goal.title }}</span
                ><strong>{{ goal.progress }}%</strong>
              </div>
            </div>
            <p
              v-else
              class="project-page__empty"
            >
              {{ $t('pages.projects.noGoals') }}
            </p>
          </AppSurface>

          <AppSurface>
            <h2>{{ $t('pages.projects.context') }}</h2>
            <div class="project-page__links">
              <AppButton
                block
                variant="ghost"
                icon="i-lucide-activity"
                @click="navigateTo({ path: '/activity', query: { project: project.id } })"
              >
                {{ $t('nav.activity') }}
              </AppButton>
              <AppButton
                block
                variant="ghost"
                icon="i-lucide-chart-no-axes-combined"
                @click="navigateTo('/analytics')"
              >
                {{ $t('nav.analytics') }}
              </AppButton>
            </div>
          </AppSurface>
        </aside>
      </section>

      <TaskEditor
        :open="Boolean(selectedTask)"
        :task="selectedTask"
        :projects="projectsStore.projects"
        :assignees="assignees"
        @close="selectedTask = null"
        @updated="updateTask"
        @promoted="load"
      />
    </template>
  </div>
</template>

<style scoped src="~/presentation/assets/css/pages/projects-id.css"></style>
