<script setup lang="ts">
import draggable from 'vuedraggable'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task, TaskPriority } from '~/domain/entities/task'
import { normalizeAutomationTrigger, orderedWorkflowStages, workflowStageUsage } from '~/domain/services/workflows'

type Stage = {
  id: string
  name: string
  color: string
  category: 'todo' | 'in_progress' | 'done'
  position: number
  wipLimit: number | null
  wipPolicy: 'warn' | 'block'
}
type Rule = {
  id: string
  name: string
  trigger: 'task_created' | 'status_changed'
  triggerValue: string | null
  action: 'set_priority' | 'assign_user' | 'add_tag'
  actionValue: string
  enabled: boolean
  conditions: Array<{ field: string; operator: string; value: string }>
  actions: Array<{ type: string; value: string }>
}
type Execution = {
  id: string
  ruleName: string | null
  taskId: string | null
  taskTitle: string | null
  status: 'success' | 'skipped' | 'failed'
  trigger: string
  changes: Record<string, unknown>
  error: string | null
  createdAt: number
}
type DeleteTarget = { type: 'stage' | 'rule'; id: string; name: string } | null

const projectsStore = useProjectsStore()
const { t } = useI18n()
const toast = useToast()
const projectId = ref<string | null>(null)
const stages = ref<Stage[]>([])
const rules = ref<Rule[]>([])
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const editingStageId = ref<string | null>(null)
const editingRuleId = ref<string | null>(null)
const deleteTarget = ref<DeleteTarget>(null)
const activeTab = ref<'stages' | 'automations' | 'history' | 'metrics'>('stages')
const executions = ref<Execution[]>([])
const stageFormOpen = ref(false)
const ruleFormOpen = ref(false)
const testTaskId = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const testResult = ref<{ matches: boolean; changes: Record<string, unknown>; sideEffects: unknown[] } | null>(null)

const emptyStage = () => ({
  name: '',
  color: '#3b82f6',
  category: 'in_progress' as Stage['category'],
  wipLimit: null as number | null,
  wipPolicy: 'warn' as const
})
const emptyRule = () => ({
  name: '',
  trigger: 'status_changed' as Rule['trigger'],
  triggerValue: 'done',
  action: 'add_tag' as Rule['action'],
  actionValue: '',
  enabled: true,
  conditions: [] as Rule['conditions'],
  actions: [] as Rule['actions']
})
const stageForm = reactive(emptyStage())
const ruleForm = reactive(emptyRule())
const stageUsage = computed(() => workflowStageUsage(tasks.value, projectId.value))
const reusableTags = computed(() => [...new Set(tasks.value.flatMap((task) => task.tags))].sort())
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const selectedStageCount = computed(() =>
  deleteTarget.value?.type === 'stage' ? (stageUsage.value[deleteTarget.value.id] ?? 0) : 0
)
const workflowMetrics = computed(() => {
  const success = executions.value.filter((item) => item.status === 'success').length
  const failed = executions.value.filter((item) => item.status === 'failed').length
  const bottleneck = stages.value
    .slice()
    .sort((a, b) => (stageUsage.value[b.id] ?? 0) - (stageUsage.value[a.id] ?? 0))[0]
  return {
    success,
    failed,
    rate: executions.value.length ? Math.round((success / executions.value.length) * 100) : 0,
    bottleneck
  }
})

onMounted(async () => {
  await projectsStore.loadProjects()
  const requested = useRoute().query.projectId
  projectId.value =
    (typeof requested === 'string' && projectsStore.projects.some((project) => project.id === requested)
      ? requested
      : null) ??
    projectsStore.projects[0]?.id ??
    null
})
watch(projectId, load, { immediate: true })
useLiveRefresh('tasks', load)
watch(
  () => ruleForm.trigger,
  (trigger) => {
    ruleForm.triggerValue = trigger === 'task_created' ? '' : 'done'
  }
)
watch(
  () => ruleForm.action,
  () => (ruleForm.actionValue = '')
)

async function load() {
  if (!projectId.value) return
  loading.value = true
  error.value = false
  try {
    ;[stages.value, rules.value, tasks.value, assignees.value, executions.value] = await Promise.all([
      $fetch<Stage[]>(`/api/projects/${projectId.value}/workflow`),
      $fetch<Rule[]>(`/api/projects/${projectId.value}/automations`),
      fetchAllTasks(),
      $fetch<AssignableUser[]>('/api/users/assignable'),
      $fetch<Execution[]>(`/api/projects/${projectId.value}/automation-executions`)
    ])
    testTaskId.value = tasks.value.find((task) => task.projectId === projectId.value)?.id ?? ''
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function resetStageForm() {
  editingStageId.value = null
  Object.assign(stageForm, emptyStage())
  stageFormOpen.value = false
}
function editStage(item: Stage) {
  editingStageId.value = item.id
  Object.assign(stageForm, {
    name: item.name,
    color: item.color,
    category: item.category,
    wipLimit: item.wipLimit,
    wipPolicy: item.wipPolicy
  })
  stageFormOpen.value = true
}
async function saveStage() {
  if (!projectId.value || !stageForm.name.trim()) return
  saving.value = true
  try {
    if (editingStageId.value) {
      await $fetch(`/api/workflow-stages/${editingStageId.value}`, {
        method: 'PATCH',
        body: stageForm
      })
      toast.add({ title: t('pages.workflows.stageUpdated'), color: 'success' })
    } else {
      await $fetch(`/api/projects/${projectId.value}/workflow`, {
        method: 'POST',
        body: { ...stageForm, position: stages.value.length }
      })
      toast.add({ title: t('pages.workflows.stageAdded'), color: 'success' })
    }
    resetStageForm()
    await load()
  } finally {
    saving.value = false
  }
}
async function reorderStages() {
  stages.value = orderedWorkflowStages(stages.value)
  await $fetch(`/api/projects/${projectId.value}/workflow`, {
    method: 'PATCH',
    body: { stages: stages.value.map(({ id, position }) => ({ id, position })) }
  })
  toast.add({ title: t('pages.workflows.orderSaved'), color: 'success' })
}

function resetRuleForm() {
  editingRuleId.value = null
  Object.assign(ruleForm, emptyRule())
  ruleFormOpen.value = false
}
function editRule(item: Rule) {
  editingRuleId.value = item.id
  Object.assign(ruleForm, {
    name: item.name,
    trigger: item.trigger,
    triggerValue: item.triggerValue ?? '',
    action: item.action,
    actionValue: item.actionValue,
    enabled: item.enabled,
    conditions: item.conditions ?? [],
    actions: item.actions ?? []
  })
  ruleFormOpen.value = true
}
function rulePayload(
  source: Pick<
    Rule,
    'name' | 'trigger' | 'triggerValue' | 'action' | 'actionValue' | 'enabled' | 'conditions' | 'actions'
  > = ruleForm
) {
  return {
    ...source,
    triggerValue: normalizeAutomationTrigger(source.trigger, source.triggerValue)
  }
}
async function saveRule() {
  if (!projectId.value || !ruleForm.name.trim() || !ruleForm.actionValue.trim()) return
  saving.value = true
  try {
    if (editingRuleId.value) {
      await $fetch(`/api/automations/${editingRuleId.value}`, { method: 'PATCH', body: rulePayload() })
      toast.add({ title: t('pages.workflows.ruleUpdated'), color: 'success' })
    } else {
      await $fetch(`/api/projects/${projectId.value}/automations`, {
        method: 'POST',
        body: rulePayload()
      })
      toast.add({ title: t('pages.workflows.automationEnabled'), color: 'success' })
    }
    resetRuleForm()
    await load()
  } finally {
    saving.value = false
  }
}
async function toggleRule(item: Rule) {
  await $fetch(`/api/automations/${item.id}`, { method: 'PATCH', body: { enabled: !item.enabled } })
  item.enabled = !item.enabled
}
async function duplicateRule(item: Rule) {
  if (!projectId.value) return
  await $fetch(`/api/projects/${projectId.value}/automations`, {
    method: 'POST',
    body: rulePayload({ ...item, name: `${item.name} ${t('pages.workflows.copySuffix')}` })
  })
  await load()
  toast.add({ title: t('pages.workflows.ruleDuplicated'), color: 'success' })
}
async function testRule(item: Rule) {
  if (!testTaskId.value) return
  testResult.value = await ($fetch as any)(`/api/automations/${item.id}/test`, {
    method: 'POST',
    body: { taskId: testTaskId.value }
  })
}
function addCondition() {
  ruleForm.conditions.push({ field: 'priority', operator: 'equals', value: 'high' })
}
function addAction() {
  ruleForm.actions.push({ type: 'add_tag', value: 'automated' })
}
async function applyTemplate(template: 'kanban' | 'content' | 'client') {
  if (!projectId.value || stages.value.length) return
  const presets = (
    template === 'kanban'
      ? [
          ['backlog', 'todo'],
          ['working', 'in_progress'],
          ['completed', 'done']
        ]
      : template === 'content'
        ? [
            ['ideas', 'todo'],
            ['draft', 'in_progress'],
            ['review', 'in_progress'],
            ['published', 'done']
          ]
        : [
            ['request', 'todo'],
            ['delivery', 'in_progress'],
            ['approval', 'in_progress'],
            ['completed', 'done']
          ]
  ) as Array<[string, Stage['category']]>
  await Promise.all(
    presets.map(([name, category], position) =>
      $fetch(`/api/projects/${projectId.value}/workflow`, {
        method: 'POST',
        body: {
          name: t(`pages.workflows.templateStages.${name}`),
          category,
          color: ['#94a3b8', '#3b82f6', '#f59e0b', '#22c55e'][position] ?? '#3b82f6',
          position,
          wipLimit: null,
          wipPolicy: 'warn'
        }
      })
    )
  )
  await load()
}
function exportWorkflow() {
  if (!import.meta.client) return
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ stages: stages.value, rules: rules.value }, null, 2)], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'weekflow-workflow.json'
  link.click()
  URL.revokeObjectURL(url)
}

async function importWorkflow(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !projectId.value) return
  saving.value = true
  try {
    const payload = JSON.parse(await file.text()) as { stages?: Partial<Stage>[]; rules?: Partial<Rule>[] }
    if (!Array.isArray(payload.stages) || !Array.isArray(payload.rules)) throw new Error('invalid-workflow')

    for (const [position, stage] of payload.stages.slice(0, 50).entries()) {
      if (!stage.name || !['todo', 'in_progress', 'done'].includes(stage.category ?? '')) continue
      await $fetch(`/api/projects/${projectId.value}/workflow`, {
        method: 'POST',
        body: {
          name: stage.name,
          color: stage.color ?? '#3b82f6',
          category: stage.category,
          position: stages.value.length + position,
          wipLimit: stage.wipLimit ?? null,
          wipPolicy: stage.wipPolicy ?? 'warn'
        }
      })
    }
    for (const rule of payload.rules.slice(0, 50)) {
      if (!rule.name || !rule.trigger || !rule.action || !rule.actionValue) continue
      await $fetch(`/api/projects/${projectId.value}/automations`, {
        method: 'POST',
        body: rulePayload({
          name: rule.name,
          trigger: rule.trigger,
          triggerValue: rule.triggerValue ?? null,
          action: rule.action,
          actionValue: rule.actionValue,
          enabled: rule.enabled ?? true,
          conditions: rule.conditions ?? [],
          actions: rule.actions ?? []
        })
      })
    }
    await load()
    toast.add({ title: t('pages.workflows.imported'), color: 'success' })
  } catch {
    toast.add({ title: t('pages.workflows.invalidImport'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function triggerLabel(item: Pick<Rule, 'trigger' | 'triggerValue'>) {
  if (item.trigger === 'task_created') return t('pages.workflows.taskCreated')
  return `${t('pages.workflows.statusChanged')}: ${categoryLabel(item.triggerValue ?? 'todo')}`
}
function categoryLabel(value: string) {
  return t(`pages.workflows.${value === 'in_progress' ? 'inProgress' : value}`)
}
function actionLabel(item: Pick<Rule, 'action' | 'actionValue'>) {
  const label = t(
    `pages.workflows.${item.action === 'add_tag' ? 'addTag' : item.action === 'set_priority' ? 'setPriority' : 'assignUser'}`
  )
  const value =
    item.action === 'assign_user'
      ? (assignees.value.find((user) => user.id === item.actionValue)?.name ?? item.actionValue)
      : item.action === 'set_priority'
        ? t(`task.priorityValue.${item.actionValue}`)
        : item.actionValue
  return `${label}: ${value}`
}
async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  if (target.type === 'stage') await $fetch(`/api/workflow-stages/${target.id}`, { method: 'DELETE' })
  else await $fetch(`/api/automations/${target.id}`, { method: 'DELETE' })
  deleteTarget.value = null
  await load()
  toast.add({ title: t('pages.workflows.deleted'), color: 'success' })
}
</script>

<template>
  <div class="workflows-page app-container max-w-7xl">
    <PageHeader
      :title="$t('nav.workflows')"
      :description="$t('pages.workflows.description')"
      icon="i-lucide-workflow"
    >
      <template #actions>
        <FormSelect
          v-model="projectId"
          class="workflows-page__project-select"
          :aria-label="$t('pages.workflows.project')"
          :disabled="!projectsStore.projects.length"
          :placeholder="$t('pages.workflows.chooseProject')"
        >
          <option
            v-for="project in projectsStore.projects"
            :key="project.id"
            :value="project.id"
          >
            {{ project.name }}
          </option>
        </FormSelect>
      </template>
    </PageHeader>

    <nav
      class="workflows-page__tabs surface-card mb-3 flex gap-1 overflow-x-auto p-1"
      :aria-label="$t('pages.workflows.sections')"
    >
      <button
        v-for="tab in ['stages', 'automations', 'history', 'metrics'] as const"
        :key="tab"
        type="button"
        class="ui-button ui-button--sm whitespace-nowrap"
        :class="activeTab === tab ? 'ui-button--primary' : 'ui-button--ghost'"
        @click="activeTab = tab"
      >
        <UIcon
          :name="
            tab === 'stages'
              ? 'i-lucide-columns-3'
              : tab === 'automations'
                ? 'i-lucide-zap'
                : tab === 'history'
                  ? 'i-lucide-history'
                  : 'i-lucide-chart-no-axes-combined'
          "
        />{{ $t(`pages.workflows.tabs.${tab}`) }}
      </button>
      <span class="flex-1" />
      <input
        ref="importInput"
        class="sr-only"
        type="file"
        accept="application/json,.json"
        @change="importWorkflow"
      />
      <IconButton
        icon="i-lucide-upload"
        :label="$t('pages.workflows.import')"
        :disabled="saving || !projectId"
        @click="importInput?.click()"
      />
      <IconButton
        icon="i-lucide-download"
        :label="$t('pages.workflows.export')"
        @click="exportWorkflow"
      />
    </nav>

    <EmptyState
      v-if="!projectsStore.projects.length && !projectsStore.loading"
      :title="$t('pages.workflows.projectFirst')"
      :description="$t('pages.workflows.projectFirstHint')"
      icon="i-lucide-folder-plus"
    />
    <EmptyState
      v-else-if="error"
      :title="$t('pages.workflows.loadError')"
      :description="$t('pages.workflows.loadErrorHint')"
      icon="i-lucide-triangle-alert"
    >
      <AppButton
        icon="i-lucide-refresh-cw"
        @click="load"
        >{{ $t('pages.workflows.retry') }}</AppButton
      >
    </EmptyState>
    <div
      v-else-if="loading"
      class="workflows-page__loading grid gap-3 xl:grid-cols-2"
    >
      <AppSurface
        v-for="index in 2"
        :key="index"
        class="h-80 animate-pulse"
      />
    </div>
    <div
      v-else
      class="workflows-page__grid grid gap-3"
    >
      <AppSurface
        v-if="activeTab === 'stages'"
        class="workflow-panel workflow-panel--stages"
      >
        <header class="workflow-panel__header">
          <div>
            <h2 class="font-display">{{ $t('pages.workflows.stages') }}</h2>
            <p class="text-secondary text-xs">{{ $t('pages.workflows.stagesHint') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="workflow-panel__count">{{ stages.length }}</span
            ><AppButton
              size="sm"
              icon="i-lucide-plus"
              @click="stageFormOpen = true"
              >{{ $t('pages.workflows.newStage') }}</AppButton
            >
          </div>
        </header>
        <div
          v-if="!stages.length"
          class="mb-3 flex flex-wrap gap-2"
        >
          <AppButton
            v-for="template in ['kanban', 'content', 'client'] as const"
            :key="template"
            variant="secondary"
            size="sm"
            icon="i-lucide-layout-template"
            @click="applyTemplate(template)"
            >{{ $t(`pages.workflows.templates.${template}`) }}</AppButton
          >
        </div>
        <draggable
          v-if="stages.length"
          v-model="stages"
          item-key="id"
          handle=".workflow-stage__drag"
          class="workflow-panel__list"
          @end="reorderStages"
        >
          <template #item="{ element: item }">
            <article
              class="workflow-stage surface-card"
              :class="{ 'workflow-stage--over-limit': item.wipLimit && (stageUsage[item.id] ?? 0) > item.wipLimit }"
            >
              <button
                class="workflow-stage__drag"
                type="button"
                :aria-label="$t('pages.workflows.reorder')"
              >
                <UIcon name="i-lucide-grip-vertical" />
              </button>
              <span
                class="workflow-stage__color"
                :style="{ backgroundColor: item.color }"
              />
              <div class="workflow-stage__body">
                <p class="workflow-stage__name">{{ item.name }}</p>
                <p class="text-secondary text-xs">
                  {{ categoryLabel(item.category) }} ·
                  {{ $t('pages.workflows.taskCount', { count: stageUsage[item.id] ?? 0 })
                  }}<span v-if="item.wipLimit"> · WIP {{ stageUsage[item.id] ?? 0 }}/{{ item.wipLimit }}</span>
                  <span v-if="item.wipLimit"> · {{ $t(`pages.workflows.wipPolicy.${item.wipPolicy}`) }}</span>
                </p>
              </div>
              <IconButton
                icon="i-lucide-pencil"
                :label="$t('pages.workflows.editStage')"
                size="sm"
                @click="editStage(item)"
              />
              <IconButton
                icon="i-lucide-trash-2"
                :label="$t('pages.workflows.deleteStage')"
                variant="danger"
                size="sm"
                @click="deleteTarget = { type: 'stage', id: item.id, name: item.name }"
              />
            </article>
          </template>
        </draggable>
        <EmptyState
          v-else
          :title="$t('pages.workflows.noStages')"
          :description="$t('pages.workflows.noStagesHint')"
          icon="i-lucide-git-branch-plus"
        />
        <form
          v-if="stageFormOpen || editingStageId"
          class="workflow-form"
          @submit.prevent="saveStage"
        >
          <h3 class="workflow-form__title">
            {{ editingStageId ? $t('pages.workflows.editStage') : $t('pages.workflows.newStage') }}
          </h3>
          <div class="workflow-form__grid">
            <FormInput
              v-model="stageForm.name"
              required
              :placeholder="$t('pages.workflows.stageName')"
            />
            <FormSelect v-model="stageForm.category"
              ><option value="todo">{{ $t('pages.workflows.todo') }}</option>
              <option value="in_progress">{{ $t('pages.workflows.inProgress') }}</option>
              <option value="done">{{ $t('common.done') }}</option></FormSelect
            >
            <FormInput
              v-model="stageForm.color"
              type="color"
              class="workflow-form__color"
            />
            <FormInput
              v-model="stageForm.wipLimit"
              type="number"
              min="1"
              placeholder="WIP"
            />
            <FormSelect v-model="stageForm.wipPolicy"
              ><option value="warn">{{ $t('pages.workflows.wipPolicy.warn') }}</option>
              <option value="block">{{ $t('pages.workflows.wipPolicy.block') }}</option></FormSelect
            >
          </div>
          <div class="workflow-form__actions">
            <AppButton
              v-if="editingStageId"
              variant="ghost"
              @click="resetStageForm"
              >{{ $t('common.cancel') }}</AppButton
            ><AppButton
              variant="primary"
              icon="i-lucide-save"
              :loading="saving"
              @click="saveStage"
              >{{ editingStageId ? $t('common.save') : $t('common.add') }}</AppButton
            >
          </div>
        </form>
      </AppSurface>

      <AppSurface
        v-if="activeTab === 'automations'"
        class="workflow-panel"
      >
        <header class="workflow-panel__header">
          <div>
            <h2 class="font-display">{{ $t('pages.workflows.automations') }}</h2>
            <p class="text-secondary text-xs">{{ $t('pages.workflows.automationsHint') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="workflow-panel__count">{{ rules.length }}</span
            ><AppButton
              size="sm"
              icon="i-lucide-plus"
              @click="ruleFormOpen = true"
              >{{ $t('pages.workflows.newRule') }}</AppButton
            >
          </div>
        </header>
        <div
          v-if="rules.length"
          class="workflow-panel__list"
        >
          <article
            v-for="item in rules"
            :key="item.id"
            class="automation-rule surface-card"
            :class="{ 'automation-rule--disabled': !item.enabled }"
          >
            <span class="automation-rule__icon"><UIcon name="i-lucide-zap" /></span>
            <div class="automation-rule__body">
              <div class="automation-rule__heading">
                <p class="automation-rule__name">{{ item.name }}</p>
                <span class="automation-rule__status">{{
                  item.enabled ? $t('pages.workflows.enabled') : $t('pages.workflows.disabled')
                }}</span>
              </div>
              <p class="text-secondary text-xs">
                <strong>{{ $t('pages.workflows.when') }}</strong> {{ triggerLabel(item) }}
                <UIcon name="i-lucide-arrow-right" /> <strong>{{ $t('pages.workflows.then') }}</strong>
                {{ actionLabel(item) }}
              </p>
            </div>
            <IconButton
              icon="i-lucide-flask-conical"
              :label="$t('pages.workflows.testRule')"
              size="sm"
              :disabled="!testTaskId"
              @click="testRule(item)"
            />
            <IconButton
              :icon="item.enabled ? 'i-lucide-pause' : 'i-lucide-play'"
              :label="item.enabled ? $t('pages.workflows.disable') : $t('pages.workflows.enable')"
              size="sm"
              @click="toggleRule(item)"
            />
            <IconButton
              icon="i-lucide-copy"
              :label="$t('pages.workflows.duplicateRule')"
              size="sm"
              @click="duplicateRule(item)"
            />
            <IconButton
              icon="i-lucide-pencil"
              :label="$t('pages.workflows.editRule')"
              size="sm"
              @click="editRule(item)"
            />
            <IconButton
              icon="i-lucide-trash-2"
              :label="$t('pages.workflows.deleteRule')"
              variant="danger"
              size="sm"
              @click="deleteTarget = { type: 'rule', id: item.id, name: item.name }"
            />
          </article>
        </div>
        <EmptyState
          v-else
          :title="$t('pages.workflows.noRules')"
          :description="$t('pages.workflows.noRulesHint')"
          icon="i-lucide-zap-off"
        />
        <form
          v-if="ruleFormOpen || editingRuleId"
          class="workflow-form"
          @submit.prevent="saveRule"
        >
          <h3 class="workflow-form__title">
            {{ editingRuleId ? $t('pages.workflows.editRule') : $t('pages.workflows.newRule') }}
          </h3>
          <div class="workflow-form__grid workflow-form__grid--rules">
            <FormInput
              v-model="ruleForm.name"
              required
              :placeholder="$t('pages.workflows.ruleName')"
            />
            <FormSelect v-model="ruleForm.trigger"
              ><option value="task_created">{{ $t('pages.workflows.taskCreated') }}</option>
              <option value="status_changed">{{ $t('pages.workflows.statusChanged') }}</option></FormSelect
            >
            <FormSelect
              v-if="ruleForm.trigger === 'status_changed'"
              v-model="ruleForm.triggerValue"
              ><option value="todo">{{ $t('pages.workflows.todo') }}</option>
              <option value="in_progress">{{ $t('pages.workflows.inProgress') }}</option>
              <option value="done">{{ $t('common.done') }}</option></FormSelect
            >
            <FormSelect v-model="ruleForm.action"
              ><option value="add_tag">{{ $t('pages.workflows.addTag') }}</option>
              <option value="set_priority">{{ $t('pages.workflows.setPriority') }}</option>
              <option value="assign_user">{{ $t('pages.workflows.assignUser') }}</option></FormSelect
            >
            <FormSelect
              v-if="ruleForm.action === 'set_priority'"
              v-model="ruleForm.actionValue"
              required
              ><option
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
              </option></FormSelect
            >
            <FormSelect
              v-else-if="ruleForm.action === 'assign_user'"
              v-model="ruleForm.actionValue"
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
              </option></FormSelect
            >
            <div v-else>
              <FormInput
                v-model="ruleForm.actionValue"
                required
                list="workflow-tags"
                :placeholder="$t('pages.workflows.chooseTag')"
              /><datalist id="workflow-tags">
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
                <strong>{{ $t('pages.workflows.if') }}</strong
                ><IconButton
                  icon="i-lucide-plus"
                  :label="$t('pages.workflows.addCondition')"
                  size="sm"
                  @click="addCondition"
                />
              </header>
              <div
                v-for="(condition, index) in ruleForm.conditions"
                :key="index"
                class="grid grid-cols-[1fr_1fr_1fr_auto] gap-1"
              >
                <FormSelect v-model="condition.field"
                  ><option value="priority">{{ $t('task.priority') }}</option>
                  <option value="status">{{ $t('task.status') }}</option>
                  <option value="tag">{{ $t('task.tags') }}</option>
                  <option value="assigneeId">{{ $t('task.assignee') }}</option>
                  <option value="stageId">{{ $t('task.workflowStage') }}</option></FormSelect
                ><FormSelect v-model="condition.operator"
                  ><option value="equals">=</option>
                  <option value="not_equals">≠</option>
                  <option value="contains">∋</option></FormSelect
                ><FormInput v-model="condition.value" /><IconButton
                  icon="i-lucide-x"
                  :label="$t('common.delete')"
                  size="sm"
                  @click="ruleForm.conditions.splice(index, 1)"
                />
              </div>
            </section>
            <section class="automation-builder">
              <header>
                <strong>{{ $t('pages.workflows.then') }}</strong
                ><IconButton
                  icon="i-lucide-plus"
                  :label="$t('pages.workflows.addAction')"
                  size="sm"
                  @click="addAction"
                />
              </header>
              <div
                v-for="(action, index) in ruleForm.actions"
                :key="index"
                class="grid grid-cols-[1fr_1fr_auto] gap-1"
              >
                <FormSelect v-model="action.type"
                  ><option value="add_tag">{{ $t('pages.workflows.addTag') }}</option>
                  <option value="remove_tag">{{ $t('pages.workflows.removeTag') }}</option>
                  <option value="set_priority">{{ $t('pages.workflows.setPriority') }}</option>
                  <option value="set_status">{{ $t('pages.workflows.setStatus') }}</option>
                  <option value="set_stage">{{ $t('pages.workflows.setStage') }}</option>
                  <option value="move_week">{{ $t('pages.workflows.moveWeek') }}</option>
                  <option value="add_comment">{{ $t('pages.workflows.addComment') }}</option>
                  <option value="create_subtask">{{ $t('pages.workflows.createSubtask') }}</option></FormSelect
                ><FormInput v-model="action.value" /><IconButton
                  icon="i-lucide-x"
                  :label="$t('common.delete')"
                  size="sm"
                  @click="ruleForm.actions.splice(index, 1)"
                />
              </div>
            </section>
          </div>
          <div
            v-if="ruleForm.name && ruleForm.actionValue"
            class="automation-preview"
          >
            <UIcon name="i-lucide-eye" />
            <div>
              <span>{{ $t('pages.workflows.preview') }}</span>
              <p>
                <strong>{{ $t('pages.workflows.when') }}</strong> {{ triggerLabel(ruleForm) }} →
                <strong>{{ $t('pages.workflows.then') }}</strong> {{ actionLabel(ruleForm) }}
              </p>
            </div>
          </div>
          <div class="workflow-form__actions">
            <AppButton
              v-if="editingRuleId"
              variant="ghost"
              @click="resetRuleForm"
              >{{ $t('common.cancel') }}</AppButton
            ><AppButton
              variant="primary"
              icon="i-lucide-zap"
              :loading="saving"
              @click="saveRule"
              >{{ editingRuleId ? $t('common.save') : $t('pages.workflows.activate') }}</AppButton
            >
          </div>
        </form>
      </AppSurface>

      <AppSurface
        v-if="activeTab === 'history'"
        class="workflow-panel"
        ><header class="workflow-panel__header">
          <div>
            <h2 class="font-display">{{ $t('pages.workflows.executionLog') }}</h2>
            <p class="text-secondary text-xs">{{ $t('pages.workflows.executionLogHint') }}</p>
          </div>
          <FormSelect
            v-model="testTaskId"
            class="max-w-64"
            ><option value="">{{ $t('pages.workflows.chooseTestTask') }}</option>
            <option
              v-for="task in tasks.filter((item) => item.projectId === projectId)"
              :key="task.id"
              :value="task.id"
            >
              {{ task.title }}
            </option></FormSelect
          >
        </header>
        <div
          v-if="testResult"
          class="automation-preview"
        >
          <UIcon name="i-lucide-flask-conical" />
          <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
        </div>
        <div class="workflow-panel__list">
          <article
            v-for="entry in executions"
            :key="entry.id"
            class="automation-rule surface-card"
          >
            <span class="automation-rule__icon"
              ><UIcon
                :name="
                  entry.status === 'success'
                    ? 'i-lucide-circle-check'
                    : entry.status === 'failed'
                      ? 'i-lucide-circle-x'
                      : 'i-lucide-skip-forward'
                "
            /></span>
            <div class="automation-rule__body">
              <p class="automation-rule__name">
                {{ entry.ruleName }} · {{ entry.taskTitle || $t('pages.workflows.deletedTask') }}
              </p>
              <p class="text-secondary text-xs">
                {{ entry.trigger }} · {{ new Date(entry.createdAt).toLocaleString() }} ·
                {{ entry.error || Object.keys(entry.changes).join(', ') }}
              </p>
            </div>
            <AppButton
              v-if="entry.taskId"
              size="sm"
              variant="ghost"
              icon="i-lucide-arrow-up-right"
              @click="navigateTo({ path: '/', query: { task: entry.taskId } })"
              >{{ $t('pages.workflows.openTask') }}</AppButton
            >
          </article>
        </div>
        <EmptyState
          v-if="!executions.length"
          :title="$t('pages.workflows.noExecutions')"
          :description="$t('pages.workflows.noExecutionsHint')"
          icon="i-lucide-history"
      /></AppSurface>

      <div
        v-if="activeTab === 'metrics'"
        class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          :label="$t('pages.workflows.successfulRuns')"
          :value="workflowMetrics.success"
          icon="i-lucide-circle-check"
          tone="success"
        /><MetricCard
          :label="$t('pages.workflows.failedRuns')"
          :value="workflowMetrics.failed"
          icon="i-lucide-circle-x"
        /><MetricCard
          :label="$t('pages.workflows.successRate')"
          :value="`${workflowMetrics.rate}%`"
          icon="i-lucide-gauge"
        /><MetricCard
          :label="$t('pages.workflows.bottleneck')"
          :value="workflowMetrics.bottleneck?.name || '—'"
          icon="i-lucide-triangle-alert"
          :hint="
            workflowMetrics.bottleneck
              ? $t('pages.workflows.taskCount', { count: stageUsage[workflowMetrics.bottleneck.id] ?? 0 })
              : ''
          "
        />
      </div>
    </div>

    <Modal
      :open="Boolean(deleteTarget)"
      :title="
        deleteTarget?.type === 'stage' ? $t('pages.workflows.deleteStageTitle') : $t('pages.workflows.deleteRuleTitle')
      "
      size="sm"
      @close="deleteTarget = null"
    >
      <p class="text-secondary text-sm">
        {{
          deleteTarget?.type === 'stage'
            ? $t('pages.workflows.deleteStageImpact', { name: deleteTarget?.name, count: selectedStageCount })
            : $t('pages.workflows.deleteRuleImpact', { name: deleteTarget?.name })
        }}
      </p>
      <template #footer
        ><AppButton
          variant="ghost"
          @click="deleteTarget = null"
          >{{ $t('common.cancel') }}</AppButton
        ><AppButton
          variant="danger"
          icon="i-lucide-trash-2"
          @click="confirmDelete"
          >{{ $t('common.delete') }}</AppButton
        ></template
      >
    </Modal>
  </div>
</template>

<style scoped>
.workflow-panel__header,
.automation-rule__heading,
.workflow-form__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.workflow-panel__header {
  margin-bottom: 1rem;
}
.workflow-panel__count,
.automation-rule__status {
  border: 1px solid var(--color-panel-border);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
.workflow-panel__list {
  display: grid;
  gap: 0.5rem;
}
.workflow-stage,
.automation-rule {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem;
}
.workflow-stage__drag {
  display: grid;
  cursor: grab;
  color: var(--color-text-secondary);
}
.workflow-stage__color {
  width: 0.65rem;
  height: 2rem;
  border-radius: 999px;
}
.workflow-stage__body,
.automation-rule__body {
  min-width: 0;
  flex: 1;
}
.workflow-stage__name,
.automation-rule__name {
  font-weight: 650;
}
.workflow-stage--over-limit {
  border-color: #ef4444;
}
.automation-rule--disabled {
  opacity: 0.55;
}
.automation-rule__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.6rem;
  background: color-mix(in srgb, #f59e0b 14%, transparent);
  color: #f59e0b;
}
.automation-rule__heading {
  justify-content: flex-start;
}
.workflow-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-panel-border);
}
.workflow-form__title {
  margin-bottom: 0.65rem;
  font-weight: 650;
}
.workflow-form__grid {
  display: grid;
  grid-template-columns: minmax(10rem, 1fr) 9rem 4rem 6rem;
  gap: 0.5rem;
}
.workflow-panel--stages > .workflow-panel__list {
  display: flex;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}
.workflow-panel--stages .workflow-stage {
  min-width: 18rem;
}
.automation-builder {
  display: grid;
  gap: 0.5rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 0.75rem;
  padding: 0.65rem;
}
.automation-builder > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.workflow-form__grid--rules {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.workflow-form__color {
  padding: 0.3rem;
}
.workflow-form__actions {
  justify-content: flex-end;
  margin-top: 0.65rem;
}
.automation-preview {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.65rem;
  padding: 0.7rem;
  border: 1px dashed var(--color-panel-border);
  border-radius: 0.75rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
.automation-preview > svg {
  flex: none;
  margin-top: 0.15rem;
}
@media (max-width: 640px) {
  .workflow-form__grid,
  .workflow-form__grid--rules {
    grid-template-columns: 1fr;
  }
  .workflow-stage,
  .automation-rule {
    flex-wrap: wrap;
  }
  .workflow-stage__body,
  .automation-rule__body {
    min-width: calc(100% - 5rem);
  }
}
</style>
