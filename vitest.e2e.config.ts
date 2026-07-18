import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Real downloads + ffmpeg transcode need a generous ceiling.
    testTimeout: 120_000,
    hookTimeout: 120_000
  }
})
