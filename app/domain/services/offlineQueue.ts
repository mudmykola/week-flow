export interface OfflineMutation {
  id: string
  url: string
  method: 'POST' | 'PATCH' | 'DELETE'
  body?: object
  createdAt: number
}

export function compactOfflineQueue(queue: OfflineMutation[], mutation: OfflineMutation) {
  const previousIndex = queue.findIndex((item) => item.url === mutation.url)
  if (previousIndex === -1) return [...queue, mutation]
  const previous = queue[previousIndex]!
  if (mutation.method === 'PATCH' && previous.method === 'PATCH') {
    return queue.map((item, index) =>
      index === previousIndex ? { ...mutation, body: { ...previous.body, ...mutation.body } } : item
    )
  }
  if (mutation.method === 'DELETE') {
    return [...queue.filter((item) => item.url !== mutation.url), mutation]
  }
  return [...queue, mutation]
}
