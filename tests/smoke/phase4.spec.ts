import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('Phase 4 Smoke Tests', () => {
  it('auth.ts exists', () => {
    expect(fs.existsSync('src/main/auth.ts')).toBe(true)
  })

  it('netscape-cookie.ts exists', () => {
    expect(fs.existsSync('src/main/netscape-cookie.ts')).toBe(true)
  })

  it('App.tsx contains auth button', () => {
    const content = fs.readFileSync('src/renderer/src/App.tsx', 'utf-8')
    expect(content).toContain('openAuthWindow')
    expect(content).toContain('LOGIN')
  })

  it('downloader.ts references cookie handling', () => {
    const content = fs.readFileSync('src/main/downloader.ts', 'utf-8')
    expect(content).toContain('writeTempCookieFile')
    expect(content).toContain('deleteTempCookieFile')
    expect(content).toContain('--cookies')
  })
})
