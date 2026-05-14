# Phase 2: Base Download + UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement working video download via yt-dlp with a functional React UI form, real-time console output, and automatic history persistence.

**Architecture:** Main Process spawns yt-dlp with user-selected options, streams stdout/stderr through IPC to Renderer. On success, a History record is inserted via Prisma. Binary resolution is platform-aware (Windows .exe in production, PATH fallback in dev on Linux).

**Tech Stack:** Electron, React, TypeScript, Prisma, SQLite, child_process.spawn.

---

## File Structure

```
src/
├── main/
│   ├── index.ts              (update: import downloader)
│   ├── database.ts           (no change)
│   ├── ipc-handlers.ts       (update: replace placeholder download-video)
│   ├── downloader.ts         (NEW: yt-dlp spawn logic, binary resolution)
│   └── utils/
│       └── binary-path.ts    (NEW: cross-platform binary resolution)
├── preload/
│   └── index.ts              (no change)
├── renderer/
│   └── src/
│       ├── main.tsx          (no change)
│       ├── App.tsx           (update: full download UI)
│       ├── components/
│       │   └── ui/
│       │       └── ...       (Shadcn components: button, input, label, radio-group, scroll-area, checkbox)
│       └── lib/
│           └── utils.ts      (no change)
└── shared/
    └── types.ts              (no change)
```

---

## Task 1: Binary path resolution utility

**Files:**
- Create: `src/main/utils/binary-path.ts`
- Modify: `src/main/index.ts` (no direct change yet)

- [ ] **Step 1: Write binary-path.ts**

```typescript
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

function getBinaryName(base: string): string {
  return process.platform === 'win32' ? `${base}.exe` : base
}

export function getBinaryPath(base: string): string {
  const binaryName = getBinaryName(base)

  // Production: bundled in resources/bin/
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', binaryName)
  }

  // Dev: check local resources/bin first
  const localPath = path.join(process.cwd(), 'resources', 'bin', binaryName)
  if (fs.existsSync(localPath)) {
    return localPath
  }

  // Dev fallback: PATH
  return binaryName
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/utils/binary-path.ts
git commit -m "(feat): Add cross-platform binary resolution utility for yt-dlp and ffmpeg"
```

---

## Task 2: yt-dlp spawn logic (downloader.ts)

**Files:**
- Create: `src/main/downloader.ts`
- Modify: `src/main/ipc-handlers.ts` (wire up in next task)

- [ ] **Step 1: Write downloader.ts**

```typescript
import { spawn } from 'node:child_process'
import path from 'node:path'
import { BrowserWindow, ipcMain } from 'electron'
import { getPrismaClient } from './database'
import { getBinaryPath } from './utils/binary-path'
import type { DownloadOptions } from '@shared/types'

function getYtDlpArgs(options: DownloadOptions): string[] {
  const args: string[] = [options.url]

  // Format / Quality selection
  if (options.format === 'audio') {
    args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3')
  } else if (options.quality === 'best') {
    args.push('-f', 'bestvideo*+bestaudio/best')
  } else {
    const height = options.quality
    args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`)
  }

  // Output template
  const outTemplate = path.join(options.outputDir, '%(title)s.%(ext)s')
  args.push('-o', outTemplate)

  // Merge output format for video
  if (options.format !== 'audio') {
    args.push('--merge-output-format', 'mp4')
  }

  // Cookies
  if (options.useCookies) {
    // Phase 4 will implement real cookie handling
    // For now, placeholder: skip if not implemented
  }

  // Progress
  args.push('--newline')
  args.push('--no-warnings')

  return args
}

function notifyLog(window: BrowserWindow | null, line: string): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send('download-log', line.replace(/\r/g, ''))
  }
}

function notifyComplete(window: BrowserWindow | null, data: { filePath: string; title: string }): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send('download-complete', data)
  }
}

export async function startDownload(
  options: DownloadOptions,
  senderWindow: BrowserWindow | null
): Promise<{ success: boolean; error?: string; filePath?: string; title?: string }> {
  return new Promise((resolve) => {
    const binaryPath = getBinaryPath('yt-dlp')
    const args = getYtDlpArgs(options)

    notifyLog(senderWindow, `[yt-dlp] Starting download from ${options.url}`)
    notifyLog(senderWindow, `[yt-dlp] Command: ${binaryPath} ${args.join(' ')}`)

    const proc = spawn(binaryPath, args, { shell: false })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stdout += chunk
      chunk.split('\n').forEach((line) => {
        if (line.trim()) notifyLog(senderWindow, `[yt-dlp] ${line.trim()}`)
      })
    })

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stderr += chunk
      chunk.split('\n').forEach((line) => {
        if (line.trim()) notifyLog(senderWindow, `[yt-dlp] ${line.trim()}`)
      })
    })

    proc.on('error', (err) => {
      notifyLog(senderWindow, `[error] ${err.message}`)
      resolve({ success: false, error: err.message })
    })

    proc.on('close', async (code) => {
      if (code === 0) {
        // Try to extract title from stdout or use URL as fallback
        const titleMatch = stdout.match(/\[download\] Destination: (.+)/)
        const title = titleMatch ? path.basename(titleMatch[1], path.extname(titleMatch[1])) : 'Unknown'
        const ext = options.format === 'audio' ? 'mp3' : 'mp4'
        const filePath = path.join(options.outputDir, `${title}.${ext}`)

        // Persist to history
        const prisma = getPrismaClient()
        await prisma.history.create({
          data: {
            url: options.url,
            title,
            duration: '',
            format: options.format,
            quality: options.quality,
            filePath
          }
        })

        notifyComplete(senderWindow, { filePath, title })
        resolve({ success: true, filePath, title })
      } else {
        const errMsg = stderr.trim() || `yt-dlp exited with code ${code}`
        notifyLog(senderWindow, `[error] ${errMsg}`)
        resolve({ success: false, error: errMsg })
      }
    })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/downloader.ts src/main/utils/binary-path.ts
git commit -m "(feat): Add yt-dlp spawn logic with real-time IPC log streaming"
```

---

## Task 3: Wire up IPC handler for download-video

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/main/index.ts` (export mainWindow for sender reference)

- [ ] **Step 1: Update ipc-handlers.ts**

Replace the placeholder `download-video` handler with:

```typescript
import { startDownload } from './downloader'
// ... existing imports

export function registerIpcHandlers(mainWindow: BrowserWindow | null): void {
  // ... existing handlers

  ipcMain.handle('download-video', async (_, options: DownloadOptions) => {
    return startDownload(options, mainWindow)
  })

  // ... other handlers
}
```

Note: `registerIpcHandlers` signature changes to accept `mainWindow`.

- [ ] **Step 2: Update main/index.ts**

Pass `mainWindow` to `registerIpcHandlers`:

```typescript
registerIpcHandlers(mainWindow)
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-handlers.ts src/main/index.ts
git commit -m "(feat): Wire up download-video IPC handler to yt-dlp spawn logic"
```

---

## Task 4: Install Shadcn UI base components

**Files:**
- Create: `src/renderer/src/components/ui/button.tsx`
- Create: `src/renderer/src/components/ui/input.tsx`
- Create: `src/renderer/src/components/ui/label.tsx`
- Create: `src/renderer/src/components/ui/radio-group.tsx`
- Create: `src/renderer/src/components/ui/scroll-area.tsx`
- Create: `src/renderer/src/components/ui/checkbox.tsx`
- Modify: `tailwind.config.js` (add theme color mappings for shadcn)
- Modify: `src/renderer/src/index.css` (add border color variable usage)

- [ ] **Step 1: Update tailwind.config.js**

Add shadcn color theme mappings:

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
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
```

- [ ] **Step 2: Update index.css**

Add `@apply border-border` back safely now that the color mapping exists:

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 3: Write shadcn UI components**

Since we cannot run `npx shadcn add` in this environment (it requires interactive CLI), we manually create the base components based on Radix UI primitives.

**button.tsx:**
```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

**input.tsx:**
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

**label.tsx:**
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    />
  )
)
Label.displayName = 'Label'

export { Label }
```

**radio-group.tsx:**
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

type RadioGroupProps = {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('grid gap-2', className)} role="radiogroup" {...props}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          return React.cloneElement(child as React.ReactElement<RadioGroupItemProps>, {
            groupValue: props.value,
            onValueChange: props.onValueChange
          })
        })}
      </div>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

type RadioGroupItemProps = {
  value: string
  id?: string
  groupValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, groupValue, onValueChange, children, ...props }, ref) => {
    const inputId = id || value
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <input
          ref={ref}
          type="radio"
          id={inputId}
          value={value}
          checked={groupValue === value}
          onChange={() => onValueChange?.(value)}
          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
          {...props}
        />
        <Label htmlFor={inputId}>{children || value}</Label>
      </div>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
```

Wait, Label is used inside radio-group.tsx but defined in a separate file. I should import it or inline a simple label. Actually, for simplicity, I'll just use a `<span>` or import from the label module. Since we're writing these in the same task, I can import from `./label`.

But there's a circular reference risk if Label imports from utils and RadioGroup imports from Label... no, that's fine.

Actually, let me simplify. Instead of full Radix UI implementations, I can create simpler components that still look good and work. The user wants functional software, not a perfect design system clone.

Let me simplify the radio group to not need Label import:

```tsx
const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, groupValue, onValueChange, children, ...props }, ref) => {
    const inputId = id || value
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <input
          ref={ref}
          type="radio"
          id={inputId}
          value={value}
          checked={groupValue === value}
          onChange={() => onValueChange?.(value)}
          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
          {...props}
        />
        <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {children || value}
        </label>
      </div>
    )
  }
)
```

**scroll-area.tsx:**
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('relative overflow-auto', className)} {...props}>
      {children}
    </div>
  )
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
```

**checkbox.tsx:**
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <div className={cn('flex items-center space-x-2', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        {...props}
      />
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
    </div>
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
```

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js src/renderer/src/index.css src/renderer/src/components/ui/
git commit -m "(feat): Add Shadcn UI base components (Button, Input, Label, RadioGroup, ScrollArea, Checkbox)"
```

---

## Task 5: Build the Download Form UI

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Write App.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import type { DownloadOptions, SettingsData } from '@shared/types'

function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'best' | 'mp4' | 'audio'>('best')
  const [quality, setQuality] = useState<'best' | '1080' | '720' | '480' | 'audio'>('best')
  const [outputDir, setOutputDir] = useState('')
  const [useCookies, setUseCookies] = useState(false)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setOutputDir(s.defaultDownloadPath)
      setUseCookies(s.useCookies)
    })
  }, [])

  useEffect(() => {
    const unsubLog = window.api.onDownloadLog((line) => {
      setLogs((prev) => [...prev, line])
    })
    const unsubComplete = window.api.onDownloadComplete(() => {
      setDownloading(false)
    })
    return () => {
      unsubLog()
      unsubComplete()
    }
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      setOutputDir(folder)
      await window.api.setSettings({ defaultDownloadPath: folder })
    }
  }

  const handleDownload = async () => {
    if (!url.trim() || !outputDir) return
    setLogs([])
    setDownloading(true)
    const options: DownloadOptions = {
      url: url.trim(),
      format,
      quality,
      outputDir,
      useCookies
    }
    const result = await window.api.downloadVideo(options)
    if (!result.success) {
      setLogs((prev) => [...prev, `[error] ${result.error || 'Unknown error'}`])
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Video Downloader v2.0</h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="url">Video URL</Label>
        <Input
          id="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <RadioGroupItem value="best">Best</RadioGroupItem>
            <RadioGroupItem value="mp4">MP4</RadioGroupItem>
            <RadioGroupItem value="audio">Audio Only</RadioGroupItem>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Quality</Label>
          <RadioGroup value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
            <RadioGroupItem value="best">Best</RadioGroupItem>
            <RadioGroupItem value="1080">1080p</RadioGroupItem>
            <RadioGroupItem value="720">720p</RadioGroupItem>
            <RadioGroupItem value="480">480p</RadioGroupItem>
          </RadioGroup>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          label="Use Cookies"
          checked={useCookies}
          onChange={(e) => {
            const checked = (e.target as HTMLInputElement).checked
            setUseCookies(checked)
            window.api.setSettings({ useCookies: checked })
          }}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground truncate max-w-[300px]">
            {outputDir || 'No folder selected'}
          </span>
          <Button variant="outline" onClick={handleSelectFolder} disabled={downloading}>
            Select Folder
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleDownload} disabled={downloading || !url.trim() || !outputDir} className="flex-1">
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </div>

      <div className="flex-1 min-h-[200px] border rounded-md p-4 bg-muted">
        <Label className="mb-2 block">Console Output</Label>
        <ScrollArea className="h-[200px] w-full text-sm font-mono whitespace-pre-wrap">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          <div ref={logEndRef} />
        </ScrollArea>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "(feat): Add download form UI with URL input, format/quality selectors, folder picker and console output"
```

---

## Task 6: Smoke test with yt-dlp download

**Files:**
- Create: `tests/smoke/phase2.spec.ts`
- Modify: `tests/smoke/phase1.spec.ts` (rename to `smoke.spec.ts` or keep separate)

- [ ] **Step 1: Install yt-dlp for Linux dev environment**

Run: `pip install yt-dlp`
Expected: yt-dlp installed and available in PATH.

- [ ] **Step 2: Write Phase 2 smoke test**

```typescript
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

describe('Phase 2 Smoke Tests', () => {
  it('downloader.ts exists', () => {
    expect(fs.existsSync('src/main/downloader.ts')).toBe(true)
  })

  it('binary path utility exists', () => {
    expect(fs.existsSync('src/main/utils/binary-path.ts')).toBe(true)
  })

  it('UI components exist', () => {
    expect(fs.existsSync('src/renderer/src/components/ui/button.tsx')).toBe(true)
    expect(fs.existsSync('src/renderer/src/components/ui/input.tsx')).toBe(true)
    expect(fs.existsSync('src/renderer/src/components/ui/radio-group.tsx')).toBe(true)
    expect(fs.existsSync('src/renderer/src/components/ui/scroll-area.tsx')).toBe(true)
    expect(fs.existsSync('src/renderer/src/components/ui/checkbox.tsx')).toBe(true)
  })

  it('yt-dlp is available in PATH for dev testing', () => {
    try {
      const version = execSync('yt-dlp --version', { encoding: 'utf-8' }).trim()
      expect(version).toBeTruthy()
    } catch {
      throw new Error('yt-dlp not found in PATH. Install with: pip install yt-dlp')
    }
  })

  it('App.tsx contains download form elements', () => {
    const content = fs.readFileSync('src/renderer/src/App.tsx', 'utf-8')
    expect(content).toContain('downloadVideo')
    expect(content).toContain('onDownloadLog')
    expect(content).toContain('RadioGroup')
    expect(content).toContain('ScrollArea')
  })
})
```

- [ ] **Step 3: Run smoke tests**

Run: `npx vitest run tests/smoke/`
Expected: All tests PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Exit 0, all three processes built.

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add tests/smoke/phase2.spec.ts
git commit -m "(test): Add Phase 2 smoke tests for download UI and yt-dlp integration"
```

---

## Self-Review Checklist

- [ ] Spec coverage: Phase 2 requirements (download form, yt-dlp spawn, console output, history insert) all have tasks.
- [ ] Placeholder scan: No TBD or vague instructions. All component code is provided.
- [ ] Type consistency: `DownloadOptions`, `SettingsData` match shared types.
- [ ] Binary resolution: Handles both Windows .exe production and Linux PATH dev fallback.
- [ ] IPC: `download-video`, `download-log`, `download-complete` channels wired correctly.
