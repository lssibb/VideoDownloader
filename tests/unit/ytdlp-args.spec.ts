import { describe, it, expect } from 'vitest'
import {
  getYtDlpArgs,
  isValidUrl,
  isValidQuality,
  ALLOWED_QUALITIES,
  INFO_TEMPLATE
} from '../../src/main/ytdlp-args'
import type { DownloadOptions } from '../../src/shared/types'

const base: DownloadOptions = {
  url: 'https://example.com/watch?v=abc',
  format: 'best',
  quality: 'best',
  outputDir: '/tmp/out',
  useCookies: false
}

/** Return the value that follows the first occurrence of `flag`. */
function valueAfter(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

describe('isValidUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isValidUrl('http://a.com')).toBe(true)
    expect(isValidUrl('https://a.com/x?y=1')).toBe(true)
  })

  it('rejects non-http schemes and option-like strings', () => {
    expect(isValidUrl('ftp://a.com')).toBe(false)
    expect(isValidUrl('file:///etc/passwd')).toBe(false)
    expect(isValidUrl('--exec=rm -rf /')).toBe(false)
    expect(isValidUrl('-https://a.com')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })
})

describe('isValidQuality', () => {
  it('accepts every allowed quality', () => {
    for (const q of ALLOWED_QUALITIES) expect(isValidQuality(q)).toBe(true)
  })

  it('rejects unknown qualities', () => {
    expect(isValidQuality('4k')).toBe(false)
    expect(isValidQuality('240')).toBe(false)
    expect(isValidQuality('')).toBe(false)
  })
})

describe('getYtDlpArgs', () => {
  it('places the URL first', () => {
    expect(getYtDlpArgs(base)[0]).toBe(base.url)
  })

  it('audio format extracts mp3 and does not set merge-output-format', () => {
    const args = getYtDlpArgs({ ...base, format: 'audio', quality: 'audio' })
    expect(args).toContain('--extract-audio')
    expect(valueAfter(args, '--audio-format')).toBe('mp3')
    expect(valueAfter(args, '-f')).toBe('bestaudio/best')
    expect(args).not.toContain('--merge-output-format')
  })

  it('best format uses generic best selector and merges to mp4', () => {
    const args = getYtDlpArgs({ ...base, format: 'best', quality: 'best' })
    expect(valueAfter(args, '-f')).toBe('bestvideo*+bestaudio/best')
    expect(valueAfter(args, '--merge-output-format')).toBe('mp4')
  })

  it('mp4 format prefers mp4-compatible streams', () => {
    const args = getYtDlpArgs({ ...base, format: 'mp4', quality: 'best' })
    expect(valueAfter(args, '-f')).toContain('[ext=mp4]')
    expect(valueAfter(args, '--merge-output-format')).toBe('mp4')
  })

  it('applies a height cap for numeric qualities', () => {
    const args = getYtDlpArgs({ ...base, format: 'best', quality: '720' })
    expect(valueAfter(args, '-f')).toContain('height<=720')
  })

  it('mp4 with numeric quality caps height and keeps mp4 preference', () => {
    const args = getYtDlpArgs({ ...base, format: 'mp4', quality: '1080' })
    const f = valueAfter(args, '-f')!
    expect(f).toContain('height<=1080')
    expect(f).toContain('[ext=mp4]')
  })

  it('builds the output template from the output directory', () => {
    const args = getYtDlpArgs({ ...base, outputDir: '/home/me/videos' })
    expect(valueAfter(args, '-o')).toBe('/home/me/videos/%(title)s.%(ext)s')
  })

  it('adds --cookies only when a cookie path is given', () => {
    expect(getYtDlpArgs(base)).not.toContain('--cookies')
    const args = getYtDlpArgs(base, '/tmp/cookies.txt')
    expect(valueAfter(args, '--cookies')).toBe('/tmp/cookies.txt')
  })

  it('adds --print-to-file with --no-simulate when an info path is given', () => {
    const args = getYtDlpArgs(base, undefined, '/tmp/info.txt')
    expect(valueAfter(args, '--print-to-file')).toBe(INFO_TEMPLATE)
    expect(args).toContain('/tmp/info.txt')
    expect(args).toContain('--no-simulate')
  })

  it('always requests newline progress and suppresses warnings', () => {
    const args = getYtDlpArgs(base)
    expect(args).toContain('--newline')
    expect(args).toContain('--no-warnings')
  })
})
