<script setup lang="ts">
definePageMeta({ layout: false })

const { loggedIn } = useUserSession()
const { t } = useI18n()

const principles = computed(() => [
  {
    icon: 'i-lucide-focus',
    title: t('pages.about.principles.focus.title'),
    text: t('pages.about.principles.focus.text')
  },
  {
    icon: 'i-lucide-shield-check',
    title: t('pages.about.principles.trust.title'),
    text: t('pages.about.principles.trust.text')
  },
  {
    icon: 'i-lucide-sparkles',
    title: t('pages.about.principles.craft.title'),
    text: t('pages.about.principles.craft.text')
  }
])

const stack = ['Nuxt', 'Vue', 'TypeScript', 'Cloudflare Workers', 'D1', 'Drizzle ORM', 'Vitest', 'Playwright']

useSeoMeta({
  title: () => t('pages.about.metaTitle'),
  description: () => t('pages.about.metaDescription'),
  ogTitle: () => t('pages.about.metaTitle'),
  ogDescription: () => t('pages.about.metaDescription')
})
</script>

<template>
  <main class="about-page min-h-screen bg-[var(--color-bg)] px-4 py-4 sm:px-6 sm:py-6">
    <div class="about-page__shell mx-auto max-w-6xl">
      <header class="about-page__header flex items-center justify-between gap-4 py-2">
        <NuxtLink to="/">
          <BrandLogo />
        </NuxtLink>
        <NuxtLink
          :to="loggedIn ? '/' : '/login'"
          class="ui-button ui-button--secondary ui-button--sm"
        >
          <UIcon
            :name="loggedIn ? 'i-lucide-layout-dashboard' : 'i-lucide-log-in'"
            class="size-4"
          />
          {{ loggedIn ? $t('pages.about.openWorkspace') : $t('pages.about.signIn') }}
        </NuxtLink>
      </header>

      <section class="about-page__hero grid gap-8 py-14 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:py-24">
        <div>
          <p class="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--color-accent)]">
            <span class="size-2 rounded-full bg-[var(--color-accent)]" />
            {{ $t('pages.about.eyebrow') }}
          </p>
          <h1 class="font-display max-w-4xl text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-6xl">
            {{ $t('pages.about.title') }}
          </h1>
          <p class="text-secondary mt-6 max-w-2xl text-base leading-7 sm:text-lg">
            {{ $t('pages.about.intro') }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a
              href="https://github.com/mudmykola"
              target="_blank"
              rel="noopener noreferrer"
              class="ui-button ui-button--primary ui-button--md"
            >
              <UIcon
                name="i-lucide-github"
                class="size-4"
              />
              GitHub
            </a>
            <a
              href="mailto:mykola.mud@gmail.com"
              class="ui-button ui-button--secondary ui-button--md"
            >
              <UIcon
                name="i-lucide-mail"
                class="size-4"
              />
              {{ $t('pages.about.contact') }}
            </a>
          </div>
        </div>

        <aside class="about-page__profile surface-card relative overflow-hidden p-6 sm:p-8">
          <div class="absolute -top-16 -right-16 size-48 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
          <div
            class="relative grid size-16 place-items-center rounded-2xl bg-[var(--color-accent)] text-xl font-bold text-white"
          >
            {{ $t('pages.about.initials') }}
          </div>
          <h2 class="font-display relative mt-6 text-2xl font-bold">{{ $t('pages.about.developerName') }}</h2>
          <p class="text-secondary relative mt-1">Full-stack developer · Product builder</p>
          <p class="text-secondary relative mt-5 text-sm leading-6">{{ $t('pages.about.profile') }}</p>
          <div class="relative mt-6 flex items-center gap-2 border-t border-[var(--color-panel-border)] pt-5 text-sm">
            <UIcon
              name="i-lucide-map-pin"
              class="size-4 text-[var(--color-accent)]"
            />
            Ukraine
          </div>
        </aside>
      </section>

      <section class="about-page__story grid gap-4 border-t border-[var(--color-panel-border)] py-12 md:grid-cols-3">
        <article
          v-for="item in principles"
          :key="item.title"
          class="about-page__principle surface-card p-5"
        >
          <span
            class="grid size-10 place-items-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          >
            <UIcon
              :name="item.icon"
              class="size-5"
            />
          </span>
          <h2 class="font-display mt-5 text-lg font-bold">{{ item.title }}</h2>
          <p class="text-secondary mt-2 text-sm leading-6">{{ item.text }}</p>
        </article>
      </section>

      <section class="about-page__product grid gap-8 py-12 lg:grid-cols-2 lg:items-start">
        <div>
          <p class="text-sm font-bold text-[var(--color-accent)]">WeekFlow</p>
          <h2 class="font-display mt-3 text-3xl font-bold tracking-tight">{{ $t('pages.about.productTitle') }}</h2>
          <p class="text-secondary mt-4 max-w-xl leading-7">{{ $t('pages.about.productText') }}</p>
        </div>
        <div class="surface-card p-5 sm:p-6">
          <p class="text-secondary text-xs font-bold tracking-wider uppercase">{{ $t('pages.about.stack') }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="technology in stack"
              :key="technology"
              class="rounded-full border border-[var(--color-panel-border)] bg-[var(--color-bg-alt)] px-3 py-1.5 text-sm"
            >
              {{ technology }}
            </span>
          </div>
        </div>
      </section>

      <footer
        class="about-page__footer text-secondary flex flex-col gap-3 border-t border-[var(--color-panel-border)] py-8 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <span>© {{ new Date().getFullYear() }} {{ $t('pages.about.developerName') }}</span>
        <span>{{ $t('pages.about.footer') }}</span>
      </footer>
    </div>
  </main>
</template>
