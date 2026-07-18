import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const YTDLP = 'resources/bin/yt-dlp.exe'
const FFMPEG = 'resources/bin/ffmpeg.exe'

/** True when the file is a Git LFS pointer rather than the real binary. */
function isLfsPointer(p: string): boolean {
  if (!fs.existsSync(p)) return false
  try {
    return fs.readFileSync(p, 'utf-8').startsWith('version https://git-lfs')
  } catch {
    return false
  }
}

const binariesRealized = !isLfsPointer(YTDLP) && !isLfsPointer(FFMPEG)

describe('Phase 5 Smoke Tests', () => {
  it('updater.ts exists', () => {
    expect(fs.existsSync('src/main/updater.ts')).toBe(true)
  })

  it('App.tsx contains update button', () => {
    const content = fs.readFileSync('src/renderer/src/App.tsx', 'utf-8')
    expect(content).toContain('updateYtDlp')
    expect(content).toContain('UPDATE YT-DLP')
  })

  it('Windows binaries are tracked (present as file or LFS pointer)', () => {
    expect(fs.existsSync(YTDLP)).toBe(true)
    expect(fs.existsSync(FFMPEG)).toBe(true)
  })

  it('Windows binaries are declared as Git LFS objects', () => {
    const attrs = fs.readFileSync('.gitattributes', 'utf-8')
    expect(attrs).toContain('resources/bin/*.exe')
    expect(attrs).toContain('filter=lfs')
  })

  // Only meaningful once `git lfs pull` has materialized the real binaries
  // (e.g. in the packaging job). Skipped on a plain checkout where they are
  // still small LFS pointer files.
  it.skipIf(!binariesRealized)('bundled binaries have realistic sizes', () => {
    expect(fs.statSync(YTDLP).size).toBeGreaterThan(1000000)
    expect(fs.statSync(FFMPEG).size).toBeGreaterThan(10000000)
  })

  it('electron-builder config includes extraResources', () => {
    const content = fs.readFileSync('electron-builder.yml', 'utf-8')
    expect(content).toContain('extraResources')
    expect(content).toContain('portable')
  })
})
