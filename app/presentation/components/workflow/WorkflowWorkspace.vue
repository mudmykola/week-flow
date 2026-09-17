<script setup lang="ts">
import draggable from 'vuedraggable'
import { fetchAllTasks } from '~/data/repositories/tasksRepository'
import type { AssignableUser, Task } from '~/domain/entities/task'
import type {
  AutomationExecution as Execution,
  AutomationRule as Rule,
  WorkflowDeleteTarget as DeleteTarget,
  WorkflowStage as Stage,
  WorkflowTab
} from '~/domain/entities/workflow'
import { normalizeAutomationTrigger, orderedWorkflowStages, workflowStageUsage } from '~/domain/services/workflows'

const { user } = useUserSession()
const { t } = useI18n()
if (user.value?.role !== 'pm' && user.value?.role !== 'admin')
  throw createError({ statusCode: 403, statusMessage: t('pages.workflows.forbidden') })

const projectsStore = useProjectsStore()
const toast = useToast()
const projectId = ref<string | null>(null)
const stages = ref<Stage[]>([])
const rules = ref<Rule[]>([])
const tasks = ref<Task[]>([])
const assignees = ref<AssignableUser[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const deleteTarget = ref<DeleteTarget>(null)
const activeTab = ref<WorkflowTab>('stages')
const executions = ref<Execution[]>([])
const testTaskId = ref('')
const testResult = ref<{ matches: boolean; changes: Record<string, unknown>; sideEffects: unknown[] } | null>(null)
const {
  editingStageId,
  editingRuleId,
  stageFormOpen,
  ruleFormOpen,
  stageForm,
  ruleForm,
  priorities,
  resetStageForm,
  editStage,
  resetRuleForm,
  editRule,
  addCondition,
  addAction
} = useWorkflowForms()
const stageUsage = computed(() => workflowStageUsage(tasks.value, projectId.value))
const reusableTags = computed(() => [...new Set(tasks.value.flatMap((task) => task.tags))].sort())
const selectedStageCount = computed(() =>
  deleteTarget.value?.type === 'stage' ? (stageUsage.value[deleteTarget.value.id] ?? 0) : 0
)
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
  <div class="workflow-workspace workflows-page app-container">
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

    <WorkflowToolbar
      v-model:active-tab="activeTab"
      :saving="saving"
      :project-id="projectId"
      @import="importWorkflow"
      @export="exportWorkflow"
    />

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
        <BoundedTaskList
          v-if="stages.length"
          :count="stages.length"
          :preview="6"
          :row-height="74"
          storage-key="workflow-stages"
        >
          <draggable
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
        </BoundedTaskList>
        <EmptyState
          v-else
          :title="$t('pages.workflows.noStages')"
          :description="$t('pages.workflows.noStagesHint')"
          icon="i-lucide-git-branch-plus"
        />
        <WorkflowStageForm
          v-if="stageFormOpen || editingStageId"
          :form="stageForm"
          :editing="Boolean(editingStageId)"
          :saving="saving"
          @cancel="resetStageForm"
          @save="saveStage"
        />
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
        <BoundedTaskList
          v-if="rules.length"
          :count="rules.length"
          :preview="6"
          :row-height="82"
          storage-key="workflow-rules"
        >
          <div class="workflow-panel__list">
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
                  <SemanticBadge
                    :tone="item.enabled ? 'success' : 'neutral'"
                    :icon="item.enabled ? 'i-lucide-zap' : 'i-lucide-pause'"
                    >{{ item.enabled ? $t('pages.workflows.enabled') : $t('pages.workflows.disabled') }}</SemanticBadge
                  >
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
        </BoundedTaskList>
        <EmptyState
          v-else
          :title="$t('pages.workflows.noRules')"
          :description="$t('pages.workflows.noRulesHint')"
          icon="i-lucide-zap-off"
        />
        <WorkflowRuleForm
          v-if="ruleFormOpen || editingRuleId"
          :form="ruleForm"
          :editing="Boolean(editingRuleId)"
          :saving="saving"
          :assignees="assignees"
          :priorities="priorities"
          :reusable-tags="reusableTags"
          :trigger-label="triggerLabel(ruleForm)"
          :action-label="actionLabel(ruleForm)"
          @add-action="addAction"
          @add-condition="addCondition"
          @cancel="resetRuleForm"
          @save="saveRule"
        />
      </AppSurface>

      <WorkflowExecutionHistory
        v-if="activeTab === 'history'"
        v-model:test-task-id="testTaskId"
        :executions="executions"
        :tasks="tasks"
        :project-id="projectId"
        :test-result="testResult"
        @open-task="navigateTo({ path: '/', query: { task: $event } })"
      />

      <WorkflowMetrics
        v-if="activeTab === 'metrics'"
        :executions="executions"
        :stages="stages"
        :stage-usage="stageUsage"
      />
    </div>

    <WorkflowDeleteDialog
      :target="deleteTarget"
      :stage-task-count="selectedStageCount"
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style src="~/presentation/assets/css/components/workflow/workflow-workspace.css"></style>
