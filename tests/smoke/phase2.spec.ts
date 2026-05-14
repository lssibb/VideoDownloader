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
