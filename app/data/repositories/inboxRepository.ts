import { apiRequest } from '~/data/http/apiClient'
import type { InboxItem, ResolveInboxInput } from '~/domain/entities/inbox'

export const fetchInboxItems = () => apiRequest<InboxItem[]>('/api/inbox')
export const captureInboxItems = (content: string) =>
  apiRequest<InboxItem[]>('/api/inbox', { method: 'POST', body: { content } })
export const updateInboxItem = (id: string, content: string) =>
  apiRequest<InboxItem>(`/api/inbox/${id}`, { method: 'PATCH', body: { content } })
export const deleteInboxItem = (id: string) => apiRequest<{ ok: true }>(`/api/inbox/${id}`, { method: 'DELETE' })
export const resolveInboxItem = (id: string, input: ResolveInboxInput) =>
  apiRequest<{ ok: true; destination: ResolveInboxInput['destination']; entityId: string }>(
    `/api/inbox/${id}/resolve`,
    {
      method: 'POST',
      body: input
    }
  )
