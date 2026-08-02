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

const emptyStage = () => ({
  name: '',
  color: '#3b82f6',
  category: 'in_progress' as Stage['category'],
  wipLimit: null as number | null
})
const emptyRule = () => ({
  name: '',
  trigger: 'status_changed' as Rule['trigger'],
  triggerValue: 'done',
  action: 'add_tag' as Rule['action'],
  actionValue: '',
  enabled: true
})
const stageForm = reactive(emptyStage())
const ruleForm = reactive(emptyRule())
const stageUsage = computed(() => workflowStageUsage(tasks.value, projectId.value))
const reusableTags = computed(() => [...new Set(tasks.value.flatMap((task) => task.tags))].sort())
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const selectedStageCount = computed(() =>
  deleteTarget.value?.type === 'stage' ? (stageUsage.value[deleteTarget.value.id] ?? 0) : 0
)

onMounted(async () => {
  await projectsStore.loadProjects()
  projectId.value = projectsStore.projects[0]?.id ?? null
})
watch(projectId, load, { immediate: true })
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
    ;[stages.value, rules.value, tasks.value, assignees.value] = await Promise.all([
      $fetch<Stage[]>(`/api/projects/${projectId.value}/workflow`),
      $fetch<Rule[]>(`/api/projects/${projectId.value}/automations`),
      fetchAllTasks(),
      $fetch<AssignableUser[]>('/api/users/assignable')
    ])
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function resetStageForm() {
  editingStageId.value = null
  Object.assign(stageForm, emptyStage())
}
function editStage(item: Stage) {
  editingStageId.value = item.id
  Object.assign(stageForm, {
    name: item.name,
    color: item.color,
    category: item.category,
    wipLimit: item.wipLimit
  })
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
  await Promise.all(
    stages.value.map((item) =>
      $fetch(`/api/workflow-stages/${item.id}`, { method: 'PATCH', body: { position: item.position } })
    )
  )
  toast.add({ title: t('pages.workflows.orderSaved'), color: 'success' })
}

function resetRuleForm() {
  editingRuleId.value = null
  Object.assign(ruleForm, emptyRule())
}
function editRule(item: Rule) {
  editingRuleId.value = item.id
  Object.assign(ruleForm, {
    name: item.name,
    trigger: item.trigger,
    triggerValue: item.triggerValue ?? '',
    action: item.action,
    actionValue: item.actionValue,
    enabled: item.enabled
  })
}
function rulePayload(
  source: Pick<Rule, 'name' | 'trigger' | 'triggerValue' | 'action' | 'actionValue' | 'enabled'> = ruleForm
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
      class="workflows-page__grid grid gap-3 xl:grid-cols-2"
    >
      <AppSurface class="workflow-panel">
        <header class="workflow-panel__header">
          <div>
            <h2 class="font-display">{{ $t('pages.workflows.stages') }}</h2>
            <p class="text-secondary text-xs">{{ $t('pages.workflows.stagesHint') }}</p>
          </div>
          <span class="workflow-panel__count">{{ stages.length }}</span>
        </header>
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

      <AppSurface class="workflow-panel">
        <header class="workflow-panel__header">
          <div>
            <h2 class="font-display">{{ $t('pages.workflows.automations') }}</h2>
            <p class="text-secondary text-xs">{{ $t('pages.workflows.automationsHint') }}</p>
          </div>
          <span class="workflow-panel__count">{{ rules.length }}</span>
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
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  color: var(--text-secondary);
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
  color: var(--text-secondary);
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
  border-top: 1px solid var(--border);
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
  border: 1px dashed var(--border);
  border-radius: 0.75rem;
  color: var(--text-secondary);
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
