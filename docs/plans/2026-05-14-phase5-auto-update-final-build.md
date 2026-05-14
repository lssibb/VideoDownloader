# Phase 5: Auto-Update yt-dlp + Final Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic yt-dlp update via GitHub API, add update UI button, bundle Windows binaries, and verify electron-builder portable configuration.

**Architecture:** Main Process fetches latest yt-dlp release from GitHub API, downloads the `yt-dlp.exe` asset, and replaces the existing file in `resources/bin/`. Progress is streamed to the renderer via IPC. Windows binaries (`yt-dlp.exe`, `ffmpeg.exe`) are downloaded and placed in `resources/bin/` for bundling.

**Tech Stack:** Node.js `https`, `fs`, GitHub API, electron-builder.

---

## File Structure

```
src/
├── main/
│   ├── updater.ts            (NEW: GitHub API fetch, binary download, replace)
│   └── ipc-handlers.ts       (modify: wire update-ytdlp)
└── renderer/src/
    └── App.tsx               (modify: add Update yt-dlp button + log)
resources/
  └── bin/
      ├── yt-dlp.exe          (downloaded)
      └── ffmpeg.exe          (downloaded)
```

---

## Task 1: Implement yt-dlp updater

**Files:**
- Create: `src/main/updater.ts`

- [ ] **Step 1: Write updater.ts**

```typescript
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import { getBinaryPath } from './utils/binary-path'

function httpsGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'VideoDownloader/2.0' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function downloadFile(url: string, dest: string, onProgress?: (msg: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, { headers: { 'User-Agent': 'VideoDownloader/2.0' } }, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        downloadFile(res.headers.location, dest, onProgress).then(resolve).catch(reject)
        return
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (total && onProgress) {
          const pct = ((downloaded / total) * 100).toFixed(1)
          onProgress(`Downloaded ${pct}%`)
        }
      })
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

export async function updateYtDlp(
  senderWindow: BrowserWindow | null,
  onLog: (line: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    onLog('[updater] Checking GitHub for latest yt-dlp release...')
    const release = await httpsGetJson('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest')
    const version = release.tag_name
    onLog(`[updater] Latest version: ${version}`)

    const asset = release.assets?.find((a: any) => a.name === 'yt-dlp.exe')
    if (!asset) {
      return { success: false, error: 'yt-dlp.exe asset not found in release' }
    }

    const binaryPath = getBinaryPath('yt-dlp')
    const backupPath = `${binaryPath}.backup`

    // Backup existing
    if (fs.existsSync(binaryPath)) {
      fs.copyFileSync(binaryPath, backupPath)
      onLog('[updater] Existing binary backed up')
    }

    // Download new binary
    const tempPath = `${binaryPath}.tmp`
    await downloadFile(asset.browser_download_url, tempPath, (msg) => onLog(`[updater] ${msg}`))

    // Replace
    fs.renameSync(tempPath, binaryPath)
    fs.chmodSync(binaryPath, 0o755)

    // Remove backup
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }

    onLog(`[updater] Successfully updated to ${version}`)
    return { success: true }
  } catch (err) {
    const msg = (err as Error).message
    onLog(`[updater] Error: ${msg}`)
    return { success: false, error: msg }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/updater.ts
git commit -m "(feat): Add yt-dlp auto-updater via GitHub API with progress streaming"
```

---

## Task 2: Wire update IPC handler

**Files:**
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Update ipc-handlers.ts**

Import and wire:

```typescript
import { updateYtDlp } from './updater'

// Replace placeholder:
  ipcMain.handle('update-ytdlp', async () => {
    if (!mainWindow) return { success: false, error: 'Window not available' }
    const logs: string[] = []
    const result = await updateYtDlp(mainWindow, (line) => {
      logs.push(line)
      mainWindow?.webContents.send('update-log', line)
    })
    return result
  })
```

Wait, `mainWindow` is passed to `registerIpcHandlers`. The handler already has access to it.

- [ ] **Step 2: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "(feat): Wire update-ytdlp IPC handler to GitHub updater"
```

---

## Task 3: Add Update button to UI

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add update button and log display**

Add state and handler:

```tsx
  const [updating, setUpdating] = useState(false)
  const [updateLogs, setUpdateLogs] = useState<string[]>([])

  useEffect(() => {
    const unsub = window.api.onUpdateLog((line) => {
      setUpdateLogs((prev) => [...prev, line])
    })
    return unsub
  }, [])

  const handleUpdateYtDlp = async () => {
    setUpdating(true)
    setUpdateLogs([])
    const result = await window.api.updateYtDlp()
    if (!result.success) {
      setUpdateLogs((prev) => [...prev, `[error] ${result.error || 'Update failed'}`])
    }
    setUpdating(false)
  }
```

Add button next to Download:

```tsx
      <div className="flex gap-4">
        <Button onClick={handleDownload} disabled={downloading || !url.trim() || !outputDir} className="flex-1">
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
        <Button variant="outline" onClick={handleUpdateYtDlp} disabled={updating}>
          {updating ? 'Updating...' : 'Update yt-dlp'}
        </Button>
      </div>
```

Also show update logs in console or separate area. For simplicity, append to existing console or add a small update log area below. Let's add them to the existing console area with a prefix, or just use the same logs state. Actually, to keep it simple, we can just show update logs in a small area below the download button:

```tsx
      {updateLogs.length > 0 && (
        <div className="text-sm font-mono bg-muted p-2 rounded">
          {updateLogs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "(feat): Add Update yt-dlp button with progress log display"
```

---

## Task 4: Download Windows binaries for bundling

**Files:**
- `resources/bin/yt-dlp.exe`
- `resources/bin/ffmpeg.exe`

- [ ] **Step 1: Download yt-dlp.exe**

Run:
```bash
curl -L -o resources/bin/yt-dlp.exe https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
```

- [ ] **Step 2: Download ffmpeg.exe (static build)**

Source: BtbN FFmpeg builds. We'll use the latest win64 static build.

Run:
```bash
curl -L -o /tmp/ffmpeg.zip https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip
unzip -j /tmp/ffmpeg.zip "*/bin/ffmpeg.exe" -d resources/bin/
```

If unzip fails or URL changes, fallback to downloading from another source.

- [ ] **Step 3: Verify binaries**

Check that both files exist and have size > 0.

Run: `ls -lh resources/bin/`
Expected: `yt-dlp.exe` and `ffmpeg.exe` both present with significant size.

- [ ] **Step 4: Commit binaries**

```bash
git add resources/bin/yt-dlp.exe resources/bin/ffmpeg.exe
git commit -m "(chore): Bundle Windows binaries yt-dlp.exe and ffmpeg.exe"
```

---

## Task 5: Final verification and smoke tests

**Files:**
- Create: `tests/smoke/phase5.spec.ts`

- [ ] **Step 1: Write smoke test**

```typescript
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('Phase 5 Smoke Tests', () => {
  it('updater.ts exists', () => {
    expect(fs.existsSync('src/main/updater.ts')).toBe(true)
  })

  it('App.tsx contains update button', () => {
    const content = fs.readFileSync('src/renderer/src/App.tsx', 'utf-8')
    expect(content).toContain('updateYtDlp')
    expect(content).toContain('Update yt-dlp')
  })

  it('Windows binaries are bundled', () => {
    expect(fs.existsSync('resources/bin/yt-dlp.exe')).toBe(true)
    expect(fs.existsSync('resources/bin/ffmpeg.exe')).toBe(true)
    const ytdlpSize = fs.statSync('resources/bin/yt-dlp.exe').size
    const ffmpegSize = fs.statSync('resources/bin/ffmpeg.exe').size
    expect(ytdlpSize).toBeGreaterThan(1000000)
    expect(ffmpegSize).toBeGreaterThan(10000000)
  })

  it('electron-builder config includes extraResources', () => {
    const content = fs.readFileSync('electron-builder.yml', 'utf-8')
    expect(content).toContain('extraResources')
    expect(content).toContain('portable')
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
git add tests/smoke/phase5.spec.ts
git commit -m "(test): Add Phase 5 smoke tests for auto-update and final build"
```

---

## Self-Review Checklist

- [ ] Spec coverage: GitHub API check, binary download with progress, backup/replace, update UI, bundled binaries, electron-builder portable config.
- [ ] Error handling: Backup created before replace, temp file used, cleanup on failure.
- [ ] Security: User-Agent header on GitHub requests.
