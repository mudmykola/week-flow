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
vi.mock('~/data/repositories/tasksRepository', () => ({ createTask: vi.fn() }))

const note = {
  id: 'note-1',
  title: 'Дейлік',
  content: 'Підготувати питання на дейлік\nЗаписати рішення',
  color: 'yellow' as const,
  positionX: 24,
  positionY: 24,
  checkedItems: [],
  done: false,
  noteDate: new Date().toLocaleDateString('en-CA'),
  pinned: false,
  archivedAt: null,
  sortOrder: 1,
  labels: [],
  linkedTaskId: null,
  completedAt: null,
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
    await composer.setValue('Передзвонити клієнту\nНадіслати підсумок')
    await wrapper.get('.notes-quick-capture__main .app-button').trigger('click')
    await flushPromises()

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Передзвонити клієнту\nНадіслати підсумок', noteDate: note.noteDate })
    )
    expect(wrapper.findAll('.sticky-note__items').some((items) => items.text().includes('Надіслати підсумок'))).toBe(
      true
    )
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
    expect(repository.update).toHaveBeenCalledWith('note-1', { done: false, checkedItems: [0], completedAt: null })

    await wrapper.get('.sticky-note__footer button').trigger('click')
    expect(repository.update).toHaveBeenLastCalledWith('note-1', {
      done: true,
      checkedItems: [0, 1],
      completedAt: expect.any(Number)
    })

    await wrapper.get('.sticky-note__footer .ui-icon-button--danger').trigger('click')
    expect(repository.remove).toHaveBeenCalledWith('note-1')
  })
})
