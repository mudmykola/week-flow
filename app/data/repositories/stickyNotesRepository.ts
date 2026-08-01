import type { CreateStickyNoteInput, StickyNote, UpdateStickyNoteInput } from '~/domain/entities/stickyNote'
import { apiRequest } from '~/data/http/apiClient'

export function fetchStickyNotes() {
  return apiRequest<StickyNote[]>('/api/sticky-notes')
}

export function createStickyNote(input: CreateStickyNoteInput) {
  return apiRequest<StickyNote>('/api/sticky-notes', { method: 'POST', body: input })
}

export function updateStickyNote(id: string, patch: UpdateStickyNoteInput) {
  return apiRequest<StickyNote>(`/api/sticky-notes/${id}`, { method: 'PATCH', body: patch })
}

export function deleteStickyNote(id: string) {
  return apiRequest(`/api/sticky-notes/${id}`, { method: 'DELETE' })
}
