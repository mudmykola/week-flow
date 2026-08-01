import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    hookTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'app/domain/services/**/*.ts',
        'app/data/repositories/**/*.ts',
        'app/application/stores/**/*.ts',
        'server/utils/validators.ts'
      ],
      exclude: ['app/domain/services/taskLabels.ts'],
      thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 }
    }
  }
})
