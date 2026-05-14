import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('Phase 1 Smoke Tests', () => {
  it('package.json exists and has required scripts', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    expect(pkg.scripts.dev).toBeDefined()
    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts.dist).toBeDefined()
  })

  it('Prisma schema exists', () => {
    expect(fs.existsSync('prisma/schema.prisma')).toBe(true)
  })

  it('Main process entry exists', () => {
    expect(fs.existsSync('src/main/index.ts')).toBe(true)
  })

  it('Preload script exists', () => {
    expect(fs.existsSync('src/preload/index.ts')).toBe(true)
  })

  it('Renderer entry exists', () => {
    expect(fs.existsSync('src/renderer/src/main.tsx')).toBe(true)
  })

  it('Shared types exist', () => {
    expect(fs.existsSync('src/shared/types.ts')).toBe(true)
  })

  it('electron-builder config exists', () => {
    expect(fs.existsSync('electron-builder.yml')).toBe(true)
  })

  it('Tailwind config exists', () => {
    expect(fs.existsSync('tailwind.config.js')).toBe(true)
  })

  it('Binary resources directory exists', () => {
    expect(fs.existsSync('resources/bin')).toBe(true)
  })
})
