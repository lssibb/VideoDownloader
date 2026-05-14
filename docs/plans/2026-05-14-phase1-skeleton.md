# Phase 1: Project Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the complete Electron + Vite + React + TypeScript + Tailwind + Shadcn UI + Prisma + SQLite project skeleton with working IPC bridge, database connection, and binary resource structure.

**Architecture:** Multi-process Electron app built with Vite. Main Process handles system access and Prisma/SQLite. Renderer Process is a React app using Shadcn UI. Preload script exposes a typed `window.api` via `contextBridge`. Binaries (`yt-dlp.exe`, `ffmpeg.exe`) live in `resources/bin/` and are bundled via `electron-builder` `extraResources`.

**Tech Stack:** Electron 35+, Vite 6+, React 19+, TypeScript 5.6+, Tailwind CSS 3.4+, Shadcn UI (Radix), Prisma 6+, SQLite, Node.js 24.

---

## File Structure

```
VideoDownloader/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.main.config.ts
├── vite.preload.config.ts
├── vite.renderer.config.ts
├── electron-builder.yml
├── .npmrc
├── resources/
│   └── bin/
│       ├── yt-dlp.exe          (downloaded in Phase 2, placeholder now)
│       └── ffmpeg.exe          (downloaded in Phase 2, placeholder now)
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main/
│   │   ├── index.ts            # Main process entry, window creation
│   │   ├── database.ts         # Prisma client init, DB path in userData
│   │   └── ipc-handlers.ts     # IPC channel handlers
│   ├── preload/
│   │   └── index.ts            # contextBridge API definition
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx            # React entry
│   │   ├── App.tsx             # Root component
│   │   ├── index.css           # Tailwind directives + base styles
│   │   ├── components/
│   │   │   └── ui/             # Shadcn UI components
│   │   └── lib/
│   │       └── utils.ts        # cn() helper
│   └── shared/
│       └── types.ts            # Shared IPC types
├── tests/
│   └── smoke/
│       └── phase1.spec.ts      # Smoke: app launches, DB, binaries
└── docs/
    └── adr/
        └── .gitkeep
```

---

## Task 1: Initialize package.json and core dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "video-downloader",
  "version": "2.0.0",
  "description": "Desktop video downloader",
  "main": "./out/main/index.js",
  "author": "VideoDownloader Team",
  "license": "MIT",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "npm run build:main && npm run build:preload && npm run build:renderer",
    "build:main": "electron-vite build --config vite.main.config.ts",
    "build:preload": "electron-vite build --config vite.preload.config.ts",
    "build:renderer": "electron-vite build --config vite.renderer.config.ts",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "dist": "electron-builder",
    "dist:dir": "electron-builder --dir",
    "test": "vitest run",
    "test:smoke": "vitest run tests/smoke"
  },
  "dependencies": {
    "@prisma/client": "^6.6.0",
    "electron-updater": "^6.6.2"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "electron": "^35.2.0",
    "electron-builder": "^26.0.12",
    "electron-vite": "^3.1.0",
    "lucide-react": "^0.503.0",
    "postcss": "^8.5.3",
    "prisma": "^6.6.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "tailwind-merge": "^3.2.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.8.3",
    "vite": "^6.3.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Create .npmrc for peer deps**

Create: `.npmrc`
```
legacy-peer-deps=true
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, no critical errors.

- [ ] **Step 4: Commit**

```bash
git add package.json .npmrc
git commit -m "(chore): Initialize package.json with Electron + Vite + React + Prisma deps"
```

---

## Task 2: TypeScript and Vite configurations

**Files:**
- Create: `tsconfig.json`, `tsconfig.node.json`
- Create: `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`

- [ ] **Step 1: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/src/*"],
      "@main/*": ["src/main/*"],
      "@preload/*": ["src/preload/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: Write tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.main.config.ts", "vite.preload.config.ts", "vite.renderer.config.ts"]
}
```

- [ ] **Step 3: Write vite.main.config.ts**

```typescript
import { defineConfig, mergeConfig } from 'vite'
import { getBuildConfig, getBuildDefine, external, pluginHotRestart } from 'electron-vite'

export default defineConfig((env) => {
  const define = getBuildDefine(env)
  return mergeConfig(
    {
      define,
      resolve: {
        alias: {
          '@main': '/src/main',
          '@shared': '/src/shared'
        }
      },
      build: {
        lib: {
          entry: 'src/main/index.ts',
          formats: ['cjs'],
          fileName: () => '[name].js'
        },
        rollupOptions: {
          external
        }
      },
      plugins: [pluginHotRestart('restart')]
    },
    getBuildConfig(env)
  )
})
```

- [ ] **Step 4: Write vite.preload.config.ts**

```typescript
import { defineConfig, mergeConfig } from 'vite'
import { getBuildConfig, external, pluginHotRestart } from 'electron-vite'

export default defineConfig((env) => {
  return mergeConfig(
    {
      resolve: {
        alias: {
          '@preload': '/src/preload',
          '@shared': '/src/shared'
        }
      },
      build: {
        lib: {
          entry: 'src/preload/index.ts',
          formats: ['cjs'],
          fileName: () => '[name].js'
        },
        rollupOptions: {
          external
        }
      },
      plugins: [pluginHotRestart('reload')]
    },
    getBuildConfig(env)
  )
})
```

- [ ] **Step 5: Write vite.renderer.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
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
})
```

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json tsconfig.node.json vite.*.config.ts
git commit -m "(chore): Add TypeScript and Vite configurations for main, preload, renderer"
```

---

## Task 3: Prisma schema and database layer

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/main/database.ts`
- Modify: `package.json` (postinstall already present)

- [ ] **Step 1: Write Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model History {
  id        Int      @id @default(autoincrement())
  url       String
  title     String   @default("")
  duration  String   @default("")
  format    String   @default("")
  quality   String   @default("")
  filePath  String   @default("")
  createdAt DateTime @default(now())
}

model Settings {
  id                  Int     @id @default(autoincrement())
  defaultDownloadPath String  @default("")
  useCookies          Boolean @default(false)
}
```

- [ ] **Step 2: Write database.ts**

```typescript
import path from 'node:path'
import { app } from 'electron'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const dbPath = path.join(app.getPath('userData'), 'app.db')
    const dbUrl = `file:${dbPath}`
    process.env.DATABASE_URL = dbUrl

    prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    })
  }
  return prisma
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
```

- [ ] **Step 3: Generate Prisma Client**

Run: `npx prisma generate`
Expected: Client generated in `node_modules/.prisma/client`.

- [ ] **Step 4: Push schema to DB**

Run: `DATABASE_URL=file:./dev.db npx prisma db push`
Expected: SQLite database created, schema applied.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/main/database.ts
git commit -m "(feat): Add Prisma schema and database layer with SQLite in userData"
```

---

## Task 4: Shared types and IPC preload script

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/preload/index.ts`

- [ ] **Step 1: Write shared types**

```typescript
export interface DownloadOptions {
  url: string
  format: 'best' | 'mp4' | 'audio'
  quality: 'best' | '1080' | '720' | '480' | 'audio'
  outputDir: string
  useCookies: boolean
}

export interface HistoryItem {
  id: number
  url: string
  title: string
  duration: string
  format: string
  quality: string
  filePath: string
  createdAt: string
}

export interface SettingsData {
  defaultDownloadPath: string
  useCookies: boolean
}

export interface API {
  downloadVideo: (options: DownloadOptions) => Promise<{ success: boolean; error?: string }>
  onDownloadLog: (callback: (line: string) => void) => () => void
  onDownloadComplete: (callback: (data: { filePath: string; title: string }) => void) => () => void

  getSettings: () => Promise<SettingsData>
  setSettings: (settings: Partial<SettingsData>) => Promise<void>

  getHistory: () => Promise<HistoryItem[]>
  clearHistory: () => Promise<void>
  openFile: (filePath: string) => Promise<void>
  openFolder: (filePath: string) => Promise<void>

  selectFolder: () => Promise<string | null>
  updateYtDlp: () => Promise<{ success: boolean; error?: string }>
  onUpdateLog: (callback: (line: string) => void) => () => void

  openAuthWindow: () => Promise<void>
}

declare global {
  interface Window {
    api: API
  }
}
```

- [ ] **Step 2: Write preload script**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { API, DownloadOptions, SettingsData } from '@shared/types'

const api: API = {
  downloadVideo: (options: DownloadOptions) => ipcRenderer.invoke('download-video', options),
  onDownloadLog: (callback) => {
    const handler = (_: unknown, line: string) => callback(line)
    ipcRenderer.on('download-log', handler)
    return () => ipcRenderer.removeListener('download-log', handler)
  },
  onDownloadComplete: (callback) => {
    const handler = (_: unknown, data: { filePath: string; title: string }) => callback(data)
    ipcRenderer.on('download-complete', handler)
    return () => ipcRenderer.removeListener('download-complete', handler)
  },

  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: Partial<SettingsData>) => ipcRenderer.invoke('set-settings', settings),

  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  openFolder: (filePath: string) => ipcRenderer.invoke('open-folder', filePath),

  selectFolder: () => ipcRenderer.invoke('select-folder'),
  updateYtDlp: () => ipcRenderer.invoke('update-ytdlp'),
  onUpdateLog: (callback) => {
    const handler = (_: unknown, line: string) => callback(line)
    ipcRenderer.on('update-log', handler)
    return () => ipcRenderer.removeListener('update-log', handler)
  },

  openAuthWindow: () => ipcRenderer.invoke('open-auth-window')
}

contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/preload/index.ts
git commit -m "(feat): Add shared IPC types and preload script with contextBridge"
```

---

## Task 5: Main process entry and IPC handlers

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Write ipc-handlers.ts**

```typescript
import { dialog, ipcMain, shell } from 'electron'
import { getPrismaClient } from './database'
import type { DownloadOptions, SettingsData } from '@shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-settings', async () => {
    const prisma = getPrismaClient()
    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({ data: {} })
    }
    return {
      defaultDownloadPath: settings.defaultDownloadPath,
      useCookies: settings.useCookies
    } as SettingsData
  })

  ipcMain.handle('set-settings', async (_, partial: Partial<SettingsData>) => {
    const prisma = getPrismaClient()
    const existing = await prisma.settings.findFirst()
    if (existing) {
      await prisma.settings.update({ where: { id: existing.id }, data: partial })
    } else {
      await prisma.settings.create({ data: partial })
    }
  })

  ipcMain.handle('get-history', async () => {
    const prisma = getPrismaClient()
    const items = await prisma.history.findMany({ orderBy: { createdAt: 'desc' } })
    return items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))
  })

  ipcMain.handle('clear-history', async () => {
    const prisma = getPrismaClient()
    await prisma.history.deleteMany()
  })

  ipcMain.handle('open-file', async (_, filePath: string) => {
    if (filePath) await shell.openPath(filePath)
  })

  ipcMain.handle('open-folder', async (_, filePath: string) => {
    if (filePath) await shell.showItemInFolder(filePath)
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  // Placeholder handlers for Phase 2+
  ipcMain.handle('download-video', async () => {
    return { success: false, error: 'Not implemented in Phase 1' }
  })

  ipcMain.handle('update-ytdlp', async () => {
    return { success: false, error: 'Not implemented in Phase 1' }
  })

  ipcMain.handle('open-auth-window', async () => {
    // Phase 4
  })
}
```

- [ ] **Step 2: Write main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIpcHandlers } from './ipc-handlers'
import { getPrismaClient, disconnectDatabase } from './database'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  getPrismaClient()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await disconnectDatabase()
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts src/main/ipc-handlers.ts
git commit -m "(feat): Add main process entry and IPC handler registration"
```

---

## Task 6: Renderer React app + Tailwind CSS setup

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/index.css`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/lib/utils.ts`
- Create: `tailwind.config.js`, `postcss.config.js`

- [ ] **Step 1: Write tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {}
    }
  },
  plugins: [require('tailwindcss-animate')]
}
```

- [ ] **Step 2: Write postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 3: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video Downloader v2.0</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Write index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 6: Write utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Write App.tsx**

```tsx
import { useEffect, useState } from 'react'
import type { SettingsData } from '@shared/types'

function App() {
  const [settings, setSettings] = useState<SettingsData | null>(null)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-4">Video Downloader v2.0</h1>
      <p className="text-muted-foreground">
        Default path: {settings?.defaultDownloadPath || 'Not set'}
      </p>
      <p className="text-muted-foreground">
        Use cookies: {settings?.useCookies ? 'Yes' : 'No'}
      </p>
    </div>
  )
}

export default App
```

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.js postcss.config.js src/renderer/
git commit -m "(feat): Add React renderer with Tailwind CSS and basic App shell"
```

---

## Task 7: Electron-builder configuration and binary resources

**Files:**
- Create: `electron-builder.yml`
- Create: `resources/bin/.gitkeep`
- Create: `docs/adr/.gitkeep`

- [ ] **Step 1: Write electron-builder.yml**

```yaml
appId: com.videodownloader.app
productName: VideoDownloader
directories:
  buildResources: build
  output: dist
files:
  - out/**
  - prisma/schema.prisma
extraResources:
  - from: resources/bin/
    to: bin
    filter:
      - '**/*'
win:
  target:
    - target: portable
      arch:
        - x64
  icon: build/icon.ico
portable:
  artifactName: VideoDownloader-${version}-portable.exe
npmRebuild: false
publish: null
```

- [ ] **Step 2: Create placeholder dirs**

Run: `mkdir -p resources/bin && touch resources/bin/.gitkeep`
Run: `mkdir -p docs/adr && touch docs/adr/.gitkeep`

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml resources/bin/.gitkeep docs/adr/.gitkeep
git commit -m "(chore): Add electron-builder portable config and binary resource placeholders"
```

---

## Task 8: Smoke test and verification

**Files:**
- Create: `tests/smoke/phase1.spec.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
})
```

- [ ] **Step 2: Write smoke test**

```typescript
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Phase 1 Smoke Tests', () => {
  it('package.json exists and has required scripts', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    expect(pkg.scripts.dev).toBeDefined()
    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts.dist).toBeDefined()
  })

  it('Prisma schema exists', () => {
    expect(fs.existsSync('prisma/schema.prisma')).toBe(true)
  })

  it('Main process entry exists', () => {
    expect(fs.existsSync('src/main/index.ts')).toBe(true)
  })

  it('Preload script exists', () => {
    expect(fs.existsSync('src/preload/index.ts')).toBe(true)
  })

  it('Renderer entry exists', () => {
    expect(fs.existsSync('src/renderer/main.tsx')).toBe(true)
  })

  it('Shared types exist', () => {
    expect(fs.existsSync('src/shared/types.ts')).toBe(true)
  })

  it('electron-builder config exists', () => {
    expect(fs.existsSync('electron-builder.yml')).toBe(true)
  })

  it('Tailwind config exists', () => {
    expect(fs.existsSync('tailwind.config.js')).toBe(true)
  })

  it('Binary resources directory exists', () => {
    expect(fs.existsSync('resources/bin')).toBe(true)
  })
})
```

- [ ] **Step 3: Run smoke tests**

Run: `npx vitest run tests/smoke/phase1.spec.ts`
Expected: All 9 tests PASS.

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (may need to add `electron` types or adjust tsconfig if issues).

- [ ] **Step 5: Commit**

```bash
git add tests/smoke/phase1.spec.ts vitest.config.ts
git commit -m "(test): Add Phase 1 smoke tests for project skeleton"
```

---

## Self-Review Checklist

- [ ] **Spec coverage**: All Phase 1 requirements (Electron shell, Vite, React, Tailwind, Shadcn base, Prisma schema, IPC types, preload, main handlers, electron-builder, binary placeholders) are covered by tasks.
- [ ] **Placeholder scan**: No TBD, TODO, or vague steps. Each step has exact file paths and commands.
- [ ] **Type consistency**: `SettingsData`, `HistoryItem`, `DownloadOptions`, `API` types match across `types.ts`, `preload.ts`, and `ipc-handlers.ts`.
- [ ] **Prisma path**: `DATABASE_URL` is set dynamically to `userData/app.db`.
- [ ] **Security**: `contextIsolation: true`, `nodeIntegration: false` in main window.
