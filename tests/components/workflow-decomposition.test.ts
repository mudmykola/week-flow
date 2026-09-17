// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('workflow workspace decomposition', () => {
  it('keeps the route page as a thin feature entry point', () => {
    const page = read('app/presentation/pages/workflows/index.vue')
    expect(page).toContain('<WorkflowWorkspace')
    expect(page.split('\n')).toHaveLength(4)
  })

  it('extracts focused toolbar, metrics, history and destructive action components', () => {
    const workspace = read('app/presentation/components/workflow/WorkflowWorkspace.vue')
    for (const component of [
      'WorkflowToolbar',
      'WorkflowStageForm',
      'WorkflowRuleForm',
      'WorkflowMetrics',
      'WorkflowExecutionHistory',
      'WorkflowDeleteDialog'
    ]) {
      expect(workspace).toContain(`<${component}`)
    }
    expect(read('app/presentation/components/workflow/WorkflowToolbar.vue')).toContain("'update:activeTab'")
    expect(read('app/presentation/components/workflow/WorkflowExecutionHistory.vue')).toContain("'update:testTaskId'")
    expect(read('app/application/composables/useWorkflowForms.ts')).toContain('export function useWorkflowForms')
  })

  it('keeps shared workflow contracts outside the presentation layer', () => {
    const entities = read('app/domain/entities/workflow.ts')
    expect(entities).toContain('export type WorkflowStage')
    expect(entities).toContain('export type AutomationRule')
    expect(entities).toContain('export type AutomationExecution')
  })
})
