import type { DailyReviewData, SavedDailyReview } from '~/domain/entities/review'
import { apiRequest } from '~/data/http/apiClient'

export function fetchDailyReview(date: string, start: number, end: number, userId?: string | null) {
  return apiRequest<DailyReviewData>('/api/reviews/daily', {
    query: { date, start, end, user: userId || undefined }
  })
}

export function fetchReviewHistory(date?: string) {
  return apiRequest<{ review: SavedDailyReview | null; history: SavedDailyReview[] }>('/api/reviews', {
    query: { date }
  })
}

export function saveDailyReview(input: {
  reviewDate: string
  content: string
  structuredContent?: Record<string, unknown>
  excludedTaskIds?: string[]
  status?: 'draft' | 'submitted'
}) {
  return apiRequest<SavedDailyReview>('/api/reviews', { method: 'PATCH', body: input })
}
