import type { AutomationRule, AutomationRuleDraft, WorkflowStage, WorkflowStageDraft } from '~/domain/entities/workflow'
import type { TaskPriority } from '~/domain/entities/task'

export function useWorkflowForms() {
  const editingStageId = ref<string | null>(null)
  const editingRuleId = ref<string | null>(null)
  const stageFormOpen = ref(false)
  const ruleFormOpen = ref(false)

  const emptyStage = (): WorkflowStageDraft => ({
    name: '',
    color: '#3b82f6',
    category: 'in_progress',
    wipLimit: null,
    wipPolicy: 'warn'
  })
  const emptyRule = (): AutomationRuleDraft => ({
    name: '',
    trigger: 'status_changed',
    triggerValue: 'done',
    action: 'add_tag',
    actionValue: '',
    enabled: true,
    conditions: [],
    actions: []
  })
  const stageForm = reactive(emptyStage())
  const ruleForm = reactive(emptyRule())
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

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

  function resetStageForm() {
    editingStageId.value = null
    Object.assign(stageForm, emptyStage())
    stageFormOpen.value = false
  }
  function editStage(item: WorkflowStage) {
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
  function resetRuleForm() {
    editingRuleId.value = null
    Object.assign(ruleForm, emptyRule())
    ruleFormOpen.value = false
  }
  function editRule(item: AutomationRule) {
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
  function addCondition() {
    ruleForm.conditions.push({ field: 'priority', operator: 'equals', value: 'high' })
  }
  function addAction() {
    ruleForm.actions.push({ type: 'add_tag', value: 'automated' })
  }

  return {
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
  }
}
