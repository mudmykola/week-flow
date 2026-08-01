import { normalizeAppError } from '~/domain/errors/appError'

export function useApiFeedback() {
  const toast = useToast()
  const { t } = useI18n()

  function report(error: unknown, title = t('errors.requestFailed')) {
    const appError = normalizeAppError(error)
    toast.add({
      title,
      description: t(`errors.${appError.code}`),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return appError
  }

  return { report }
}
