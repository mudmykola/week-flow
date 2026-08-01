import en from '../../i18n/locales/en.json'
import uk from '../../i18n/locales/uk.json'

export function getServerMessages(event: Parameters<typeof getCookie>[0]) {
  return getCookie(event, 'weekflow-locale') === 'en' ? en : uk
}
