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
