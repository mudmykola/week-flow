import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InboxPage from '~/presentation/pages/inbox/index.vue'

const inboxApi = vi.hoisted(() => ({
  fetchInboxItems: vi.fn(),
  captureInboxItems: vi.fn(),
  updateInboxItem: vi.fn(),
  deleteInboxItem: vi.fn(),
  resolveInboxItem: vi.fn()
}))
vi.mock('~/data/repositories/inboxRepository', () => inboxApi)
vi.mock('~/data/repositories/projectsRepository', () => ({ fetchProjects: vi.fn().mockResolvedValue([]) }))

const item = { id: 'capture-1', content: 'Plan launch', createdAt: Date.now(), updatedAt: Date.now() }
function stubs() {
  return {
    UIcon: { template: '<span />' },
    USkeleton: { template: '<div />' },
    PageHeader: { template: '<header><slot /></header>' },
    EmptyState: { template: '<div class="empty-state" />' },
    IconButton: { template: '<button type="button" @click="$emit(\'click\')" />' },
    AppButton: { props: ['loading'], template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
    FormSelect: { template: '<select><slot /></select>' },
    FormInput: { template: '<input />' },
    Teleport: { template: '<div><slot /></div>' }
  }
}

describe('Inbox Processing Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
    inboxApi.fetchInboxItems.mockResolvedValue([])
    inboxApi.captureInboxItems.mockResolvedValue([item])
    inboxApi.resolveInboxItem.mockResolvedValue({ ok: true, destination: 'today', entityId: 'task-1' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('captures multiline input through the dedicated inbox API', async () => {
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()
    await wrapper.get('textarea').setValue('First thought\nSecond thought')
    await wrapper.get('.inbox-workspace__capture-footer button').trigger('click')
    await flushPromises()
    expect(inboxApi.captureInboxItems).toHaveBeenCalledWith('First thought\nSecond thought')
    expect(wrapper.text()).toContain('Plan launch')
  })

  it('shows stale captures and processing actions', async () => {
    inboxApi.fetchInboxItems.mockResolvedValue([{ ...item, createdAt: Date.now() - 4 * 86_400_000 }])
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()
    expect(wrapper.get('.inbox-item').classes()).toContain('inbox-item--stale')
    expect(wrapper.findAll('.inbox-item__actions button')).toHaveLength(6)
  })

  it('processes a capture into today and removes it optimistically', async () => {
    inboxApi.fetchInboxItems.mockResolvedValue([item])
    const wrapper = await mountSuspended(InboxPage, { global: { stubs: stubs() } })
    await flushPromises()
    await wrapper.findAll('.inbox-item__actions button')[0]!.trigger('click')
    await flushPromises()
    expect(inboxApi.resolveInboxItem).toHaveBeenCalledWith(
      item.id,
      expect.objectContaining({ destination: 'today', plannedDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    )
    expect(wrapper.find('.inbox-item').exists()).toBe(false)
  })
})
