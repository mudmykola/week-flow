import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  app: {
    head: {
      htmlAttrs: { lang: 'uk' },
      title: 'WeekFlow'
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    '@nuxt/a11y',
    '@vite-pwa/nuxt'
  ],
  css: ['~/presentation/assets/css/main.css'],
  nitro: {
    preset: 'cloudflare-module'
  },
  dir: {
    pages: 'presentation/pages'
  },
  components: [{ path: '~/presentation/components', pathPrefix: false }],
  imports: {
    dirs: ['~/application/composables']
  },
  pinia: {
    storesDirs: ['./application/stores/**']
  },
  vite: {
    plugins: [tailwindcss()]
  },
  colorMode: { preference: 'system', fallback: 'light', classSuffix: '' },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'uk',
    locales: [
      { code: 'uk', name: 'Українська', language: 'uk-UA', file: 'uk.json' },
      { code: 'en', name: 'English', language: 'en-US', file: 'en.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'weekflow-locale',
      redirectOn: 'root',
      fallbackLocale: 'uk'
    },
    experimental: { prerenderMessages: true }
  },
  ui: { fonts: false },
  icon: { serverBundle: { collections: ['lucide'] } },
  a11y: { defaultHighlight: false, logIssues: true },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'WeekFlow',
      short_name: 'WeekFlow',
      description: 'Weekly planning and project workspace',
      theme_color: '#fe5011',
      background_color: '#f7f7f7',
      display: 'standalone',
      start_url: '/',
      icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }]
    },
    workbox: { navigateFallback: '/login' }
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
})
