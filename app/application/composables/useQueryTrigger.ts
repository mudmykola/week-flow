import type { LocationQueryRaw } from 'vue-router'

export function useQueryTrigger(
  key: string,
  expectedValue: string,
  ready: Readonly<Ref<boolean>>,
  handler: () => void,
  routing?: {
    route: { query: LocationQueryRaw }
    replace: (location: { query: LocationQueryRaw }) => Promise<unknown> | unknown
  }
) {
  const route = routing?.route ?? useRoute()
  const router = routing ? null : useRouter()
  let consuming = false

  async function consume(isReady: boolean, value: unknown) {
    if (!isReady || value !== expectedValue || consuming) return
    consuming = true
    handler()
    const query = { ...route.query }
    delete query[key]
    try {
      await (routing ? routing.replace({ query }) : router!.replace({ query }))
    } finally {
      consuming = false
    }
  }

  watch([ready, () => route.query[key]], ([isReady, value]) => void consume(isReady, value), {
    immediate: true,
    flush: 'post'
  })
}
