<script setup lang="ts">
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { Project } from '~/domain/entities/project'
import type { Task } from '~/domain/entities/task'

const projectsStore = useProjectsStore()
const { report } = useApiFeedback()
const { t } = useI18n()
const tasks = ref<Task[]>([])
const editorOpen = ref(false)
const loading = ref(true)
const loadError = ref(false)

onMounted(load)
useLiveRefresh('projects', load)
useLiveRefresh('tasks', load)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([projectsStore.loadProjects(), fetchAllTasks().then((items) => (tasks.value = items))])
  } catch (error) {
    loadError.value = true
    report(error, t('pages.projects.loadError'))
  } finally {
    loading.value = false
  }
}

function projectStats(project: Project) {
  const items = tasks.value.filter((task) => task.projectId === project.id && !task.archivedAt)
  const done = items.filter((task) => task.status === 'done').length
  return {
    total: items.length,
    active: items.length - done,
    done,
    progress: items.length ? Math.round((done / items.length) * 100) : 0
  }
}

async function saveProject(payload: { name: string; color: string }) {
  const project = await projectsStore.addProject(payload)
  editorOpen.value = false
  await navigateTo(`/projects/${project.id}`)
}

async function removeProject(id: string) {
  if (!window.confirm(t('pages.projects.deleteConfirm'))) return
  try {
    await projectsStore.removeProject(id)
  } catch (error) {
    report(error, t('pages.projects.deleteError'))
  }
}
</script>

<template>
  <div class="projects-page app-container">
    <PageHeader
      :title="$t('pages.projects.title')"
      :description="$t('pages.projects.description')"
      icon="i-lucide-folder-kanban"
      :count="projectsStore.projects.length"
    >
      <template #actions>
        <AppButton
          variant="primary"
          icon="i-lucide-folder-plus"
          @click="editorOpen = true"
        >
          {{ $t('pages.projects.new') }}
        </AppButton>
      </template>
    </PageHeader>

    <div
      v-if="loading"
      class="projects-page__grid"
    >
      <USkeleton
        v-for="item in 3"
        :key="item"
        class="h-52 rounded-2xl"
      />
    </div>

    <EmptyState
      v-else-if="loadError"
      :title="$t('pages.projects.loadError')"
      :description="$t('pages.projects.loadErrorHint')"
      icon="i-lucide-triangle-alert"
    >
      <AppButton @click="load">{{ $t('common.tryAgain') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!projectsStore.projects.length"
      :title="$t('pages.projects.empty')"
      :description="$t('pages.projects.emptyHint')"
      icon="i-lucide-folder-plus"
    >
      <AppButton
        variant="primary"
        icon="i-lucide-plus"
        @click="editorOpen = true"
      >
        {{ $t('pages.projects.new') }}
      </AppButton>
    </EmptyState>

    <section
      v-else
      class="projects-page__grid"
      :aria-label="$t('pages.projects.listLabel')"
    >
      <NuxtLink
        v-for="project in projectsStore.projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="projects-page__card surface-card"
      >
        <header class="projects-page__card-header">
          <span
            class="projects-page__color"
            :style="{ backgroundColor: project.color }"
          />
          <span class="projects-page__icon"><UIcon name="i-lucide-folder-kanban" /></span>
          <UIcon
            name="i-lucide-arrow-up-right"
            class="projects-page__open"
          />
        </header>
        <div>
          <h2>{{ project.name }}</h2>
          <p>{{ $t('pages.projects.activeTasks', { count: projectStats(project).active }) }}</p>
        </div>
        <div class="projects-page__progress">
          <div>
            <span>{{ $t('pages.projects.progress') }}</span>
            <strong>{{ projectStats(project).progress }}%</strong>
          </div>
          <div class="projects-page__track">
            <span :style="{ width: `${projectStats(project).progress}%`, backgroundColor: project.color }" />
          </div>
          <small>{{ $t('pages.projects.completedTasks', projectStats(project)) }}</small>
        </div>
      </NuxtLink>
    </section>

    <ProjectEditor
      :open="editorOpen"
      :projects="projectsStore.projects"
      @close="editorOpen = false"
      @save="saveProject"
      @delete="removeProject"
    />
  </div>
</template>

<style scoped src="~/presentation/assets/css/pages/projects.css"></style>
