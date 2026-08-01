import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotesPage from '~/presentation/pages/notes/index.vue'

const repository = vi.hoisted(() => ({
  fetch: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}))

vi.mock('~/data/repositories/stickyNotesRepository', () => ({
  fetchStickyNotes: repository.fetch,
  createStickyNote: repository.create,
  updateStickyNote: repository.update,
  deleteStickyNote: repository.remove
}))

const note = {
  id: 'note-1',
  content: 'Підготувати питання на дейлік\nЗаписати рішення',
  color: 'yellow' as const,
  positionX: 24,
  positionY: 24,
  checkedItems: [],
  done: false,
  createdAt: 1,
  updatedAt: 1
}

describe('daily sticky-note board', () => {
  beforeEach(() => {
    repository.fetch.mockReset().mockResolvedValue([note])
    repository.create.mockReset().mockImplementation(async (input) => ({ ...note, id: 'note-2', ...input }))
    repository.update.mockReset().mockImplementation(async (_id, patch) => ({ ...note, ...patch }))
    repository.remove.mockReset().mockResolvedValue({ ok: true })
  })

  it('loads account notes and creates a quick sticky note', async () => {
    const wrapper = await mountSuspended(NotesPage, {
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          USkeleton: { template: '<div />' },
          PageHeader: { template: '<header />' }
        }
      }
    })
    await flushPromises()
    expect(wrapper.get('.sticky-note__items').text()).toContain('Підготувати питання на дейлік')
    expect(wrapper.get('.sticky-note__items').text()).toContain('Записати рішення')

    const composer = wrapper.find('section textarea')
    await composer.trigger('focus')
    await composer.setValue('1. Передзвонити клієнту')
    await composer.trigger('keydown', { key: 'Enter' })
    expect(composer.element.value).toBe('1. Передзвонити клієнту\n2. ')
    await composer.setValue('1. Передзвонити клієнту\n2. Надіслати підсумок')
    await wrapper.get('.notes-page__composer button').trigger('click')
    await flushPromises()

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Передзвонити клієнту\nНадіслати підсумок' })
    )
    expect(wrapper.findAll('.sticky-note__items').at(-1)!.text()).toContain('Надіслати підсумок')
  })

  it('marks and deletes an existing sticky note', async () => {
    const wrapper = await mountSuspended(NotesPage, {
      global: {
        stubs: {
          UIcon: { template: '<span />' },
          USkeleton: { template: '<div />' },
          PageHeader: { template: '<header />' }
        }
      }
    })
    await flushPromises()
    await wrapper.get('.sticky-note__item').trigger('click')
    expect(repository.update).toHaveBeenCalledWith('note-1', { done: false, checkedItems: [0] })

    await wrapper.get('.sticky-note__footer button').trigger('click')
    expect(repository.update).toHaveBeenLastCalledWith('note-1', { done: true, checkedItems: [0, 1] })

    await wrapper.get('.sticky-note__footer .ui-icon-button--danger').trigger('click')
    expect(repository.remove).toHaveBeenCalledWith('note-1')
  })
})
