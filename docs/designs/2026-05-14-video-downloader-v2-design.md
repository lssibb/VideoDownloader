# Design Document: Video Downloader v2.0

**Date**: 2026-05-14
**Status**: Approved
**Target Platform**: Windows (portable .exe)
**Stack**: Electron + React + TypeScript + Vite + Tailwind CSS + Shadcn UI + Prisma + SQLite

## 1. Overview

Cross-platform desktop application (Windows target, portable build) for downloading video/audio from streaming platforms. Uses yt-dlp.exe as the download engine and ffmpeg.exe (static build) for muxing. Provides a modern React-based GUI, local download history via SQLite, cookie-based authentication, and automatic yt-dlp updates.

## 2. Architecture

### 2.1 Process Model
- Main Process (Node.js): System access, binary spawning, database queries via Prisma, IPC handlers.
- Renderer Process (React): UI only. No direct system access. Communicates via contextBridge (preload.ts).
- Preload (preload.ts): Exposes strictly typed window.api to the renderer.

### 2.2 Binary Management
- yt-dlp.exe and ffmpeg.exe are bundled via electron-builder extraResources into resources/bin/ (outside app.asar).
- yt-dlp automatically delegates muxing to ffmpeg when found in the same directory or PATH. No direct ffmpeg spawn from TypeScript.
- Main Process resolves binary paths at runtime using path.join(process.resourcesPath, bin, yt-dlp.exe).

### 2.3 Database
- Engine: SQLite via Prisma ORM.
- Location: app.getPath(userData)/app.db (avoids permission issues in Program Files).
- Models:
  - History: id, url, title, duration, format, quality, filePath, createdAt.
  - Settings: id, defaultDownloadPath (String), useCookies (Boolean).

## 3. Functional Requirements

### 3.1 Main UI (Shadcn UI + React)
- URL Input: Text field for the video URL.
- Format Selector: RadioGroup for best / mp4 / audio.
- Quality Selector: RadioGroup for best, 1080p, 720p, 480p, audio only.
- Cookie Checkbox: Использовать Cookie (enabled only after login flow).
- Login Button: Войти в Google Account — opens BrowserWindow with accounts.google.com.
- Download Button: Triggers IPC call.
- Folder Selector: Button calling dialog.showOpenDialog({ properties: [openDirectory] }). Path saved to Settings.
- Console Output: ScrollArea showing real-time yt-dlp stdout/stderr.

### 3.2 Cookie Authentication Flow
1. User clicks Войти в Google Account.
2. Main Process opens BrowserWindow (Chromium) navigated to accounts.google.com.
3. User completes login manually; window closes.
4. When Использовать Cookie is checked and download starts:
   - Main Process calls session.defaultSession.cookies.get({ domain: .youtube.com }).
   - Converts JSON cookie array to Netscape format.
   - Writes to path.join(os.tmpdir(), vd-cookies-<uuid>.txt).
   - Passes path to yt-dlp via --cookies flag.
   - Deletes temp file on process exit (success or error).

### 3.3 Download Logic (IPC)
- Channel: window.api.downloadVideo(options).
- Options: { url, format, quality, outputDir, useCookies }.
- Main Process:
  - Builds yt-dlp args: URL, -f format selector, -o output template, --cookies if enabled, --merge-output-format mp4, etc.
  - Spawns via child_process.spawn().
  - Streams stdout/stderr through IPC to renderer (ipcMain.on / ipcRenderer.on).
  - Strips carriage returns before sending.
  - On success: inserts record into History.
  - On error: sends error message to renderer, no DB insert.

### 3.4 yt-dlp Auto-Update
- Button Обновить yt-dlp in UI.
- Main Process fetches https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest.
- Downloads yt-dlp.exe asset.
- Replaces existing file in resources/bin/yt-dlp.exe.
- Sends progress/status back to renderer.

## 4. IPC Contract

Interfaces:
- DownloadOptions: url, format, quality, outputDir, useCookies.
- API methods:
  - downloadVideo
  - onDownloadLog / onDownloadComplete
  - getSettings / setSettings
  - getHistory / clearHistory
  - openFile / openFolder
  - selectFolder
  - updateYtDlp / onUpdateLog
  - openAuthWindow

## 5. Error Handling

- Spawn errors (ENOENT): show setup error.
- yt-dlp errors: show last stderr lines in UI.
- Network errors: graceful fallback.
- Cookie errors: warn user, proceed without cookies.

## 6. Testing Strategy

- Smoke tests per phase: build succeeds, app launches, core feature works.
- Final e2e: portable .exe built, launched, test video downloaded, history updated, settings persist.

## 7. Phases

| Phase | Scope |
|-------|-------|
| 1 | Skeleton: Electron + Vite + React + Tailwind + Shadcn + Prisma + binaries |
| 2 | Base download + UI: IPC bridge, form, spawn yt-dlp, console output, basic history insert |
| 3 | Settings + History management: CRUD settings, folder dialog, history page, open file/folder |
| 4 | Cookie auth: Google login window, cookie extraction, Netscape conversion, temp file cleanup |
| 5 | Auto-update + final build: GitHub API download, binary replacement, electron-builder portable .exe |
