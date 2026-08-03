export function useTaskKeyboard(options: {
  enabled: Ref<boolean>
  onCreate: () => void
  onEdit: () => void
  onClose: () => void
  onSave: () => void
  onSearch: () => void
  onMove: (direction: -1 | 1) => void
  onCommands: () => void
}) {
  useEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null
    const typing = target?.matches('input, textarea, select, [contenteditable="true"]')
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      options.onSave()
      return
    }
    if (event.key === 'Escape') {
      options.onClose()
      return
    }
    if (typing || !options.enabled.value) return
    if (event.key.toLowerCase() === 'n') options.onCreate()
    else if (event.key.toLowerCase() === 'e') options.onEdit()
    else if (event.key === '/') {
      event.preventDefault()
      options.onSearch()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') options.onMove(-1)
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') options.onMove(1)
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      options.onCommands()
    }
  })
}
