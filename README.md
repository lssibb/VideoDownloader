# VideoDownloader

A portable desktop video downloader — a clean Electron + React front-end over
[`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and `ffmpeg`. Paste a URL, pick a
format/quality, and download. Optional cookie-based authentication lets you
fetch videos that require a signed-in session, and a built-in updater keeps
`yt-dlp` current.

<p align="center">
  <img src="build/icon.png" width="128" alt="VideoDownloader icon" />
</p>

## Features

- **Download** video (best / mp4) or extract **audio** (mp3) at selectable
  quality (best / 1080p / 720p / 480p).
- **Live log** streamed from `yt-dlp` while a download runs.
- **History** of past downloads with title, format, quality, duration, and
  quick *Open file* / *Open folder* actions.
- **Cookie auth** — sign in through an in-app Google window; cookies are
  exported in Netscape format to a short-lived temp file, used for the download,
  then deleted.
- **Self-update** for the bundled `yt-dlp` binary, pulled from GitHub releases.

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Shell      | Electron 43 (contextIsolation + sandbox, no nodeIntegration) |
| UI         | React 19, Tailwind CSS, Radix primitives           |
| Build      | electron-vite (Vite 6)                              |
| Data       | Prisma 6 + SQLite (main process only)              |
| Downloader | `yt-dlp` + `ffmpeg` (bundled on Windows)           |

## Getting started

### Prerequisites

- Node.js 18+ and npm
- [Git LFS](https://git-lfs.com/) (the Windows binaries are stored via LFS)
- For local development on macOS/Linux: `yt-dlp` and `ffmpeg` available on your
  `PATH` (e.g. `pip install yt-dlp` and your package manager's `ffmpeg`). On
  Windows they are bundled under `resources/bin/`.

### Install

```bash
git clone <repo-url>
cd VideoDownloader
git lfs pull          # materialize resources/bin/*.exe
npm install           # runs `prisma generate` via postinstall
```

### Run in development

```bash
npm run dev
```

### Build a production bundle

```bash
npm run build         # compile main/preload/renderer into out/
npm run dist          # package a Windows portable .exe into dist/
```

> The packaging step downloads the Electron binary and reads the LFS-backed
> `yt-dlp.exe` / `ffmpeg.exe`, so run `git lfs pull` first and ensure network
> access to Electron's release host.

## How it works

1. The renderer collects the URL + options and calls `downloadVideo` over a
   typed, `contextBridge`-exposed IPC surface (`src/preload/index.ts`).
2. The main process validates input, optionally exports browser cookies to a
   Netscape file, and builds the `yt-dlp` argument list
   (`src/main/ytdlp-args.ts`).
3. `yt-dlp` is spawned (`src/main/ytdlp-run.ts`); stdout/stderr are streamed
   back to the UI, and `--print-to-file` captures the real title, duration, and
   final file path.
4. The result is persisted to SQLite via Prisma and surfaced in the History
   table.

Key security properties: the renderer is sandboxed with no Node access; URLs are
validated against `https?://` and rejected if they look like CLI flags;
`yt-dlp` is spawned with `shell: false` (no shell interpolation); cookie files
live only for the duration of a download.

## Testing

```bash
npm test              # unit + smoke tests (deterministic, no network)
npm run test:unit     # pure-logic unit tests
npm run test:smoke    # structural / config smoke tests
npm run test:e2e      # hermetic end-to-end: real yt-dlp + ffmpeg over localhost
```

The e2e suite generates a sample clip with `ffmpeg`, serves it from a localhost
HTTP server, and drives the real download pipeline for both the video (mp4) and
audio (mp3) paths — no external network required. It self-skips when `yt-dlp` /
`ffmpeg` are not installed.

## Project layout

```
src/
  main/        Electron main process (IPC, downloader, updater, db, auth)
    ytdlp-args.ts   pure yt-dlp argument builder + validators
    ytdlp-run.ts    pure spawn/stream + metadata parsing
  preload/     contextBridge IPC surface
  renderer/    React UI
  shared/      shared TypeScript types
prisma/        SQLite schema
resources/bin/ bundled Windows binaries (Git LFS)
tests/         unit / smoke / e2e
docs/          design docs, plans, ADRs
```

## License

MIT
