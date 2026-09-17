<script setup lang="ts">
const nuxtApp = useNuxtApp()
const visible = ref(true)
let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined
let shownAt = Date.now()

function clearTimers() {
  if (showTimer) clearTimeout(showTimer)
  if (hideTimer) clearTimeout(hideTimer)
  showTimer = undefined
  hideTimer = undefined
}

function show() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = undefined
  if (visible.value || showTimer) return

  showTimer = setTimeout(() => {
    shownAt = Date.now()
    visible.value = true
    showTimer = undefined
  }, 120)
}

function hide() {
  if (showTimer) clearTimeout(showTimer)
  showTimer = undefined
  if (!visible.value) return

  const delay = Math.max(0, 320 - (Date.now() - shownAt))
  hideTimer = setTimeout(() => {
    visible.value = false
    hideTimer = undefined
  }, delay)
}

nuxtApp.hook('page:start', show)
nuxtApp.hook('page:finish', hide)
nuxtApp.hook('vue:error', hide)

onMounted(() => requestAnimationFrame(hide))
onBeforeUnmount(clearTimers)
</script>

<template>
  <div class="app-preloader">
    <Teleport to="body">
      <Transition name="app-preloader">
        <div
          v-if="visible"
          class="app-preloader__overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div class="app-preloader__surface">
            <BrandLogo
              compact
              size="sm"
            />
            <div class="app-preloader__content">
              <strong>WeekFlow</strong>
              <span>{{ $t('common.loading') }}</span>
            </div>
            <span
              class="app-preloader__indicator"
              aria-hidden="true"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped src="~/presentation/assets/css/components/common/app-preloader.css"></style>
