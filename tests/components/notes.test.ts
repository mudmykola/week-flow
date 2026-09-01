import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotesPage from '~/presentation/pages/notes/index.vue'
import NotesToolbar from '~/presentation/components/notes/NotesToolbar.vue'
import NotesSection from '~/presentation/components/notes/NotesSection.vue'

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
          PageHeader: { template: '<header><slot name="actions" /></header>' }
        }
      }
    })
    await flushPromises()
    expect(wrapper.get('.sticky-note__items').text()).toContain('Підготувати питання на дейлік')
    expect(wrapper.get('.sticky-note__items').text()).toContain('Записати рішення')

    await wrapper.get('.notes-quick-capture__trigger').trigger('click')
    const firstItem = wrapper.get('[data-capture-item="0"]')
    await firstItem.setValue('Передзвонити клієнту')
    await firstItem.trigger('keydown', { key: 'Enter' })
    await wrapper.get('[data-capture-item="1"]').setValue('Надіслати підсумок')
    await wrapper.get('.notes-quick-capture__paper footer .app-button').trigger('click')
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
          PageHeader: { template: '<header><slot name="actions" /></header>' }
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

describe('compact sticky-note controls', () => {
  it('opens search from an icon and selects a view from one dropdown', async () => {
    const wrapper = await mountSuspended(NotesToolbar, {
      props: { view: 'today', query: '', counts: { today: 3, pinned: 1, all: 4, archive: 0 } },
      global: { stubs: { UIcon: { template: '<span />' } } }
    })

    expect(wrapper.findAll('.notes-toolbar__view-trigger')).toHaveLength(1)
    expect(wrapper.findAll('.notes-toolbar__search-trigger')).toHaveLength(1)
    await wrapper.get('.notes-toolbar__view-trigger').trigger('click')
    await wrapper.findAll('.notes-toolbar__view-menu button')[1]!.trigger('click')
    expect(wrapper.emitted('view')?.[0]).toEqual(['pinned'])

    await wrapper.get('.notes-toolbar__search-trigger').trigger('click')
    await wrapper.get('.notes-toolbar__search-popover input').setValue('рішення')
    expect(wrapper.emitted('query')?.at(-1)).toEqual(['рішення'])
  })
})

describe('aligned sticky-note sorting', () => {
  it('persists card order and resets freeform coordinates after sorting', async () => {
    const wrapper = await mountSuspended(NotesSection, {
      props: { title: 'Сьогодні', icon: 'i-lucide-sticky-note', notes: [note], editingId: null, empty: 'Порожньо' },
      global: { stubs: { UIcon: { template: '<span />' } } }
    })
    await flushPromises()

    const sortable = wrapper.findComponent({ name: 'draggable' })
    sortable.vm.$emit('start')
    sortable.vm.$emit('end')
    await flushPromises()

    expect(wrapper.emitted('patch')?.[0]?.[0]).toEqual(note)
    expect(wrapper.emitted('patch')?.[0]?.[1]).toEqual({ positionX: 0, positionY: 0, sortOrder: 2 })
  })
})
