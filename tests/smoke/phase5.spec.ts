import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('Phase 5 Smoke Tests', () => {
  it('updater.ts exists', () => {
    expect(fs.existsSync('src/main/updater.ts')).toBe(true)
  })

  it('App.tsx contains update button', () => {
    const content = fs.readFileSync('src/renderer/src/App.tsx', 'utf-8')
    expect(content).toContain('updateYtDlp')
    expect(content).toContain('UPDATE YT-DLP')
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
