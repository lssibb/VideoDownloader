# Phase 3: Settings and History Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a History section to the UI showing previous downloads with actions to open file/folder, plus a clear-history function. Polish settings persistence and folder selection.

**Architecture:** Reuse existing IPC handlers (`getHistory`, `clearHistory`, `openFile`, `openFolder`). Add React state and UI components to display history as a table/card list. No backend changes required.

**Tech Stack:** React, TypeScript, Tailwind CSS, Shadcn UI components.

---

## File Structure

```
src/renderer/src/
├── App.tsx              (update: add History section)
├── components/
│   └── ui/
│       ├── table.tsx    (NEW: simple table components)
│       └── card.tsx     (NEW: card wrapper)
```

---

## Task 1: Create Table UI components

**Files:**
- Create: `src/renderer/src/components/ui/table.tsx`

- [ ] **Step 1: Write table.tsx**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', className)} {...props} />
  )
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
  )
)
TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/ui/table.tsx
git commit -m "(feat): Add Table UI component for history display"
```

---

## Task 2: Update App.tsx with History section

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { DownloadOptions, HistoryItem, SettingsData } from '@shared/types'

function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'best' | 'mp4' | 'audio'>('best')
  const [quality, setQuality] = useState<'best' | '1080' | '720' | '480' | 'audio'>('best')
  const [outputDir, setOutputDir] = useState('')
  const [useCookies, setUseCookies] = useState(false)
  const [, setSettings] = useState<SettingsData | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  const loadHistory = async () => {
    const items = await window.api.getHistory()
    setHistory(items)
  }

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setOutputDir(s.defaultDownloadPath)
      setUseCookies(s.useCookies)
    })
    loadHistory()
  }, [])

  useEffect(() => {
    const unsubLog = window.api.onDownloadLog((line) => {
      setLogs((prev) => [...prev, line])
    })
    const unsubComplete = window.api.onDownloadComplete(() => {
      setDownloading(false)
      loadHistory()
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

  const handleClearHistory = async () => {
    await window.api.clearHistory()
    setHistory([])
  }

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col gap-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Video Downloader v2.0</h1>

      {/* Download Form */}
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

      {/* Console Output */}
      <div className="flex-1 min-h-[200px] border rounded-md p-4 bg-muted">
        <Label className="mb-2 block">Console Output</Label>
        <ScrollArea className="h-[200px] w-full text-sm font-mono whitespace-pre-wrap">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          <div ref={logEndRef} />
        </ScrollArea>
      </div>

      {/* History Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Download History</h2>
          <Button variant="outline" size="sm" onClick={handleClearHistory} disabled={history.length === 0}>
            Clear History
          </Button>
        </div>

        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No downloads yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={item.title}>
                    {item.title || 'Unknown'}
                  </TableCell>
                  <TableCell>{item.format}</TableCell>
                  <TableCell>{item.quality}</TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.api.openFile(item.filePath)}>
                        Open
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => window.api.openFolder(item.filePath)}>
                        Folder
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/components/ui/table.tsx
git commit -m "(feat): Add History section with table, open file/folder actions and clear history"
```

---

## Task 3: Smoke tests and verification

**Files:**
- Create: `tests/smoke/phase3.spec.ts`

- [ ] **Step 1: Write Phase 3 smoke test**

```typescript
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('Phase 3 Smoke Tests', () => {
  it('Table component exists', () => {
    expect(fs.existsSync('src/renderer/src/components/ui/table.tsx')).toBe(true)
  })

  it('App.tsx includes history section', () => {
    const content = fs.readFileSync('src/renderer/src/App.tsx', 'utf-8')
    expect(content).toContain('getHistory')
    expect(content).toContain('clearHistory')
    expect(content).toContain('openFile')
    expect(content).toContain('openFolder')
    expect(content).toContain('Download History')
  })
})
```

- [ ] **Step 2: Run all smoke tests**

Run: `npx vitest run tests/smoke/`
Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Exit 0.

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add tests/smoke/phase3.spec.ts
git commit -m "(test): Add Phase 3 smoke tests for history management UI"
```

---

## Self-Review Checklist

- [ ] Spec coverage: History display, open file/folder, clear history all implemented.
- [ ] Placeholder scan: No TBD or vague steps.
- [ ] Type consistency: `HistoryItem` type used correctly from shared types.
- [ ] Reuses existing IPC: No new backend handlers needed.
