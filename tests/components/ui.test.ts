import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import EmptyState from '~/presentation/components/common/EmptyState.vue'
import MetricCard from '~/presentation/components/analytics/MetricCard.vue'
import TaskCard from '~/presentation/components/task/TaskCard.vue'
import AppButton from '~/presentation/components/base/AppButton.vue'
import IconButton from '~/presentation/components/base/IconButton.vue'
import DropdownMenu from '~/presentation/components/overlay/DropdownMenu.vue'
import AppDrawer from '~/presentation/components/overlay/AppDrawer.vue'
import ProjectEditor from '~/presentation/components/project/ProjectEditor.vue'
import TaskEditor from '~/presentation/components/task/TaskEditor.vue'
import TaskQuickCreate from '~/presentation/components/task/TaskQuickCreate.vue'
import Modal from '~/presentation/components/overlay/Modal.vue'
import FormField from '~/presentation/components/form/FormField.vue'
import FormInput from '~/presentation/components/form/FormInput.vue'
import FormSelect from '~/presentation/components/form/FormSelect.vue'
import FormCheckbox from '~/presentation/components/form/FormCheckbox.vue'
import AppShell from '~/presentation/components/shell/AppShell.vue'
import { makeTask } from '../fixtures'

const stubs = {
  UIcon: { template: '<span class="icon" />' },
  UButton: { template: '<button><slot /></button>' },
  Teleport: true
}

describe('shared UI components', () => {
  beforeEach(() => localStorage.clear())

  it('keeps global task creation on the current route', async () => {
    await navigateTo('/calendar')
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: '<div>Calendar content</div>' },
      global: {
        stubs: {
          ...stubs,
          TaskEditor: { props: ['open'], template: '<div data-task-editor :data-open="open" />' }
        }
      }
    })
    const createButton = wrapper.findAll('header button').find((button) => button.attributes('type') === 'button')!
    expect(createButton.element.tagName).toBe('BUTTON')
    expect(createButton.attributes('href')).toBeUndefined()
  })

  it('renders metric content and trend', async () => {
    const wrapper = await mountSuspended(MetricCard, {
      props: { label: 'Виконано', value: 12, icon: 'i-lucide-check', trend: '+4', hint: 'За тиждень' },
      global: { stubs }
    })
    expect(wrapper.text()).toContain('Виконано')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('+4')
    expect(wrapper.text()).toContain('За тиждень')
  })

  it('renders empty state and its action slot', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'Порожньо', description: 'Додайте задачу', icon: 'i-lucide-inbox' },
      slots: { default: '<button>Створити</button>' },
      global: { stubs }
    })
    expect(wrapper.text()).toContain('Порожньо')
    expect(wrapper.text()).toContain('Створити')
  })

  it('renders a stable placeholder for an empty disabled select', async () => {
    const wrapper = await mountSuspended(FormSelect, {
      props: { modelValue: null, placeholder: 'Немає доступних варіантів', disabled: true }
    })
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.get('option').text()).toBe('Немає доступних варіантів')
    expect(wrapper.get('option').attributes('disabled')).toBeDefined()
  })

  it('supports a fullscreen workspace drawer', async () => {
    const wrapper = await mountSuspended(AppDrawer, {
      props: { open: true, title: 'Task workspace', size: 'fullscreen' },
      slots: { default: '<main>Workspace content</main>' },
      global: { stubs }
    })

    expect(wrapper.get('.ui-drawer').classes()).toContain('ui-drawer--fullscreen')
    expect(wrapper.text()).toContain('Workspace content')
  })

  it('creates tasks inline with Enter and opens the full editor with Shift+Enter', async () => {
    const wrapper = await mountSuspended(TaskQuickCreate, {
      props: { status: 'in_progress', projects: [], assignees: [] },
      global: { stubs, components: { FormInput, FormSelect, IconButton } }
    })
    const input = wrapper.get('input[type="text"]')
    await input.setValue('Швидка задача')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('create')?.[0]?.[0]).toMatchObject({
      title: 'Швидка задача',
      status: 'in_progress',
      priority: 'medium'
    })
    await input.setValue('Повна задача')
    await input.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('full')?.[0]).toEqual(['in_progress'])
  })

  it('supports compact icon-only checkboxes without losing an accessible name', async () => {
    const wrapper = await mountSuspended(FormCheckbox, {
      props: { modelValue: false, 'aria-label': 'Вибрати користувача' }
    })
    expect(wrapper.text()).toBe('')
    expect(wrapper.get('input').attributes('aria-label')).toBe('Вибрати користувача')
  })

  it('emits task interactions by mouse and keyboard', async () => {
    const task = makeTask({ note: 'Details', tags: ['one'], priority: 'urgent' })
    const wrapper = await mountSuspended(TaskCard, {
      props: { task, project: null },
      global: {
        stubs,
        components: { AppButton, IconButton, DropdownMenu }
      }
    })
    await wrapper.get('article').trigger('click')
    await wrapper.get('article').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('edit')).toHaveLength(2)
    await wrapper.findAll('button')[0]!.trigger('click')
    await wrapper.find('button.ui-icon-button').trigger('click')
    await wrapper.get('button.ui-button--danger').trigger('click')
    expect(wrapper.emitted('cycleStatus')?.[0]).toEqual([task])
    expect(wrapper.emitted('delete')?.[0]).toEqual([task.id])
  })

  it('hides secondary task details in compact mode', async () => {
    const wrapper = await mountSuspended(TaskCard, {
      props: { task: makeTask({ note: 'Hidden note', tags: ['hidden'] }), project: null, compact: true },
      global: { stubs }
    })
    expect(wrapper.text()).not.toContain('Hidden note')
    expect(wrapper.text()).not.toContain('hidden')
  })

  it('creates a project from the reusable modal controls', async () => {
    const wrapper = await mountSuspended(ProjectEditor, {
      props: { open: true, projects: [] },
      global: { stubs, components: { Modal, AppButton, IconButton, FormField, FormInput, FormSelect } }
    })
    await wrapper.get('input[type="text"]').setValue('Новий проєкт')
    await wrapper.findAll('footer button').at(-1)!.trigger('click')
    expect(wrapper.emitted('save')?.[0]).toEqual([{ name: 'Новий проєкт', color: '#fe5011' }])
  })

  it('reuses saved task tags and persists practical creation defaults', async () => {
    const wrapper = await mountSuspended(TaskEditor, {
      props: {
        open: true,
        task: null,
        projects: [{ id: 'project-1', name: 'Робота', color: '#fe5011', createdAt: 1, ownerId: 'user-1' }],
        assignees: [],
        tagOptions: ['клієнт']
      },
      global: {
        stubs: {
          ...stubs,
          AppDrawer: { template: '<div><slot /><slot name="footer" /></div>' }
        }
      }
    })
    await wrapper.findAll('input[type="text"]')[0]!.setValue('Підготувати звіт')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('клієнт'))!
      .trigger('click')
    await wrapper.get('.ui-button--primary').trigger('click')
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ title: 'Підготувати звіт', tags: ['клієнт'] })
    expect(JSON.parse(localStorage.getItem('weekflow-reusable-tags') ?? '[]')).toContain('клієнт')
    expect(localStorage.getItem('weekflow-task-defaults')).toBeTruthy()
  })

  it('adds and removes reusable tags as interactive chips', async () => {
    const wrapper = await mountSuspended(TaskEditor, {
      props: { open: true, task: null, projects: [], assignees: [], tagOptions: ['focus'] },
      global: {
        stubs: {
          ...stubs,
          AppDrawer: { template: '<div><slot /><slot name="footer" /></div>' }
        }
      }
    })
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('focus'))!
      .trigger('click')
    const removeChip = wrapper.findAll('button[aria-label]').find((button) => button.text().includes('#focus'))!
    expect(removeChip.exists()).toBe(true)
    await removeChip.trigger('click')
    expect(wrapper.findAll('input[type="text"]').at(-1)!.element.value).toBe('')
  })
})
