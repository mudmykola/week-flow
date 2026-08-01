import type { CreateStickyNoteInput, StickyNote, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'

export function fetchStickyNotes() {
  return $fetch<StickyNote[]>('/api/sticky-notes')
}

export function createStickyNote(input: CreateStickyNoteInput) {
  return $fetch<StickyNote>('/api/sticky-notes', { method: 'POST', body: input })
}

export function updateStickyNote(id: string, patch: UpdateStickyNoteInput) {
  return $fetch<StickyNote>(`/api/sticky-notes/${id}`, { method: 'PATCH', body: patch })
}

export function deleteStickyNote(id: string) {
  return $fetch(`/api/sticky-notes/${id}`, { method: 'DELETE' })
}
