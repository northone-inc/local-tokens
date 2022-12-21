import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    silent: false,
    reporters: ['verbose'],
    coverage: {
      reporter: ['json', 'html', 'lcov'],
    },
  },
})
