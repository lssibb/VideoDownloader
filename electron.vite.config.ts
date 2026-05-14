import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve('src/main/index.ts'),
        formats: ['cjs'],
        fileName: () => '[name].js'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve('src/preload/index.ts'),
        formats: ['cjs'],
        fileName: () => '[name].js'
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    root: resolve('src/renderer'),
    build: {
      outDir: resolve('out/renderer'),
      emptyOutDir: true
    },
    plugins: [react()]
  }
})
