export type SyncKind = 'tasks' | 'goals' | 'projects'

let channel: BroadcastChannel | null = null
const localEvent = 'weekflow:sync'

function getChannel() {
  if (!import.meta.client) return null
  if (!channel) channel = new BroadcastChannel('weekflow-sync')
  return channel
}

export function broadcastSync(kind: SyncKind) {
  if (import.meta.client) window.dispatchEvent(new CustomEvent<SyncKind>(localEvent, { detail: kind }))
  getChannel()?.postMessage(kind)
}

export function useLiveRefresh(kind: SyncKind, refetch: () => void | Promise<void>) {
  const visible = useDocumentVisibility()
  watch(visible, (state) => {
    if (state === 'visible') void refetch()
  })

  const own = getChannel()
  const onLocal = (event: Event) => {
    if ((event as CustomEvent<SyncKind>).detail === kind) void refetch()
  }
  if (import.meta.client) window.addEventListener(localEvent, onLocal)
  if (own) {
    const listener = (event: MessageEvent<SyncKind>) => {
      if (event.data === kind) void refetch()
    }
    own.addEventListener('message', listener)
    onUnmounted(() => {
      own.removeEventListener('message', listener)
      window.removeEventListener(localEvent, onLocal)
    })
  }
}
