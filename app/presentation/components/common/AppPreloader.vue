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
            <span class="app-preloader__mark">
              <UIcon
                name="i-lucide-check-check"
                class="size-5"
              />
            </span>
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

<style scoped>
.app-preloader {
  display: contents;
}

.app-preloader__overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: color-mix(in srgb, var(--color-bg-alt) 74%, transparent);
  backdrop-filter: blur(5px);
}

.app-preloader__surface {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 12rem;
  overflow: hidden;
  border: 1px solid var(--color-panel-border);
  border-radius: 1rem;
  padding: 0.75rem;
  color: var(--color-text-primary);
  background: var(--color-panel-bg);
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.14);
}

.app-preloader__mark {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.75rem;
  color: white;
  background: var(--color-accent);
}

.app-preloader__content {
  display: grid;
  gap: 0.1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.app-preloader__content strong {
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.app-preloader__indicator {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--color-accent);
  transform-origin: left;
  animation: app-preloader-progress 1.2s ease-in-out infinite;
}

.app-preloader-enter-active,
.app-preloader-leave-active {
  transition: opacity 160ms ease;
}

.app-preloader-enter-from,
.app-preloader-leave-to {
  opacity: 0;
}

@keyframes app-preloader-progress {
  0% {
    transform: scaleX(0);
  }
  55% {
    transform: scaleX(0.78);
  }
  100% {
    transform: scaleX(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-preloader__indicator {
    animation: none;
    opacity: 0.72;
  }

  .app-preloader-enter-active,
  .app-preloader-leave-active {
    transition: none;
  }
}
</style>
