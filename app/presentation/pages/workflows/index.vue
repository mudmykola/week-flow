<script setup lang="ts">
type Stage = {
  id: string
  name: string
  color: string
  category: 'todo' | 'in_progress' | 'done'
  position: number
  wipLimit: number | null
}
type Rule = {
  id: string
  name: string
  trigger: 'task_created' | 'status_changed'
  triggerValue: string | null
  action: 'set_priority' | 'assign_user' | 'add_tag'
  actionValue: string
  enabled: boolean
}
const projectsStore = useProjectsStore()
const projectId = ref<string | null>(null)
const stages = ref<Stage[]>([])
const rules = ref<Rule[]>([])
const stage = reactive({
  name: '',
  color: '#3b82f6',
  category: 'in_progress' as Stage['category'],
  wipLimit: null as number | null
})
const rule = reactive({
  name: '',
  trigger: 'status_changed' as Rule['trigger'],
  triggerValue: 'done',
  action: 'add_tag' as Rule['action'],
  actionValue: ''
})
const toast = useToast()
const { t } = useI18n()

onMounted(async () => {
  await projectsStore.loadProjects()
  projectId.value = projectsStore.projects[0]?.id ?? null
})
watch(projectId, load, { immediate: true })
async function load() {
  if (!projectId.value) return
  ;[stages.value, rules.value] = (await Promise.all([
    $fetch(`/api/projects/${projectId.value}/workflow`),
    $fetch(`/api/projects/${projectId.value}/automations`)
  ])) as [Stage[], Rule[]]
}
async function addStage() {
  if (!projectId.value || !stage.name.trim()) return
  await $fetch(`/api/projects/${projectId.value}/workflow`, {
    method: 'POST',
    body: { ...stage, position: stages.value.length }
  })
  stage.name = ''
  await load()
  toast.add({ title: t('pages.workflows.stageAdded'), color: 'success' })
}
async function removeStage(id: string) {
  await $fetch(`/api/workflow-stages/${id}`, { method: 'DELETE' })
  await load()
}
async function addRule() {
  if (!projectId.value || !rule.name.trim() || !rule.actionValue.trim()) return
  await $fetch(`/api/projects/${projectId.value}/automations`, { method: 'POST', body: rule })
  Object.assign(rule, { name: '', actionValue: '' })
  await load()
  toast.add({ title: t('pages.workflows.automationEnabled'), color: 'success' })
}
async function removeRule(id: string) {
  await $fetch(`/api/automations/${id}`, { method: 'DELETE' })
  await load()
}
</script>

<template>
  <div class="workflows-page app-container max-w-6xl">
    <PageHeader
      :title="$t('nav.workflows')"
      :description="$t('pages.workflows.description')"
      icon="i-lucide-workflow"
      ><template #actions
        ><FormSelect v-model="projectId"
          ><option
            v-for="project in projectsStore.projects"
            :key="project.id"
            :value="project.id"
          >
            {{ project.name }}
          </option></FormSelect
        ></template
      ></PageHeader
    >
    <EmptyState
      v-if="!projectsStore.projects.length"
      :title="$t('pages.workflows.projectFirst')"
      :description="$t('pages.workflows.projectFirstHint')"
      icon="i-lucide-folder-plus"
    />
    <div
      v-else
      class="grid gap-3 xl:grid-cols-2"
    >
      <AppSurface
        ><div class="mb-4">
          <h2 class="font-display">{{ $t('pages.workflows.stages') }}</h2>
          <p class="text-secondary text-xs">{{ $t('pages.workflows.stagesHint') }}</p>
        </div>
        <div class="space-y-2">
          <AppSurface
            v-for="item in stages"
            :key="item.id"
            class="flex items-center gap-3"
            :padded="true"
            ><span
              class="size-3 rounded-full"
              :style="{ backgroundColor: item.color }" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ item.name }}</p>
              <p class="text-secondary text-xs">
                {{ item.category }}<span v-if="item.wipLimit"> · WIP {{ item.wipLimit }}</span>
              </p>
            </div>
            <IconButton
              icon="i-lucide-trash-2"
              :label="$t('pages.workflows.deleteStage')"
              variant="danger"
              size="sm"
              @click="removeStage(item.id)"
          /></AppSurface>
        </div>
        <form
          class="mt-4 grid gap-2 sm:grid-cols-[1fr_8rem_5rem_5rem_auto]"
          @submit.prevent="addStage"
        >
          <FormInput
            v-model="stage.name"
            :placeholder="$t('pages.workflows.newStage')"
          /><FormSelect v-model="stage.category"
            ><option value="todo">{{ $t('pages.workflows.todo') }}</option>
            <option value="in_progress">{{ $t('pages.workflows.inProgress') }}</option>
            <option value="done">{{ $t('common.done') }}</option></FormSelect
          ><FormInput
            v-model="stage.color"
            type="color"
            class="p-1"
          /><FormInput
            v-model="stage.wipLimit"
            type="number"
            min="1"
            placeholder="WIP"
          /><AppButton
            variant="primary"
            icon="i-lucide-plus"
            @click="addStage"
            >{{ $t('common.add') }}</AppButton
          >
        </form></AppSurface
      >
      <AppSurface
        ><div class="mb-4">
          <h2 class="font-display">{{ $t('pages.workflows.automations') }}</h2>
          <p class="text-secondary text-xs">{{ $t('pages.workflows.automationsHint') }}</p>
        </div>
        <div class="space-y-2">
          <AppSurface
            v-for="item in rules"
            :key="item.id"
            class="flex items-center gap-3"
            ><UIcon
              name="i-lucide-zap"
              class="text-amber-500" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ item.name }}</p>
              <p class="text-secondary truncate text-xs">
                {{ item.trigger }} → {{ item.action }}: {{ item.actionValue }}
              </p>
            </div>
            <IconButton
              icon="i-lucide-trash-2"
              :label="$t('pages.workflows.deleteRule')"
              variant="danger"
              size="sm"
              @click="removeRule(item.id)"
          /></AppSurface>
        </div>
        <form
          class="mt-4 grid gap-2 sm:grid-cols-2"
          @submit.prevent="addRule"
        >
          <FormInput
            v-model="rule.name"
            :placeholder="$t('pages.workflows.ruleName')"
          /><FormSelect v-model="rule.trigger"
            ><option value="task_created">{{ $t('pages.workflows.taskCreated') }}</option>
            <option value="status_changed">{{ $t('pages.workflows.statusChanged') }}</option></FormSelect
          ><FormSelect
            v-if="rule.trigger === 'status_changed'"
            v-model="rule.triggerValue"
            ><option value="todo">{{ $t('pages.workflows.todo') }}</option>
            <option value="in_progress">{{ $t('pages.workflows.inProgress') }}</option>
            <option value="done">{{ $t('common.done') }}</option></FormSelect
          ><FormSelect v-model="rule.action"
            ><option value="add_tag">{{ $t('pages.workflows.addTag') }}</option>
            <option value="set_priority">{{ $t('pages.workflows.setPriority') }}</option>
            <option value="assign_user">{{ $t('pages.workflows.assignUser') }}</option></FormSelect
          ><FormInput
            v-model="rule.actionValue"
            :placeholder="$t('pages.workflows.actionValue')"
          /><AppButton
            variant="primary"
            icon="i-lucide-zap"
            @click="addRule"
            >{{ $t('pages.workflows.activate') }}</AppButton
          >
        </form></AppSurface
      >
    </div>
  </div>
</template>
