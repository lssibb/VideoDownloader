import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { convertToNetscape, writeTempCookieFile, deleteTempCookieFile } from '../../src/main/netscape-cookie'

const sampleCookie = {
  name: 'SID',
  value: 'abc123',
  domain: '.youtube.com',
  path: '/',
  secure: true,
  httpOnly: false,
  expirationDate: 2000000000.5
}

describe('convertToNetscape', () => {
  it('emits the Netscape header', () => {
    const out = convertToNetscape([])
    expect(out.startsWith('# Netscape HTTP Cookie File')).toBe(true)
  })

  it('formats a cookie as a tab-separated line', () => {
    const out = convertToNetscape([sampleCookie])
    const line = out.trim().split('\n').pop()!
    const fields = line.split('\t')
    expect(fields).toEqual(['.youtube.com', 'TRUE', '/', 'TRUE', '2000000000', 'SID', 'abc123'])
  })

  it('sets the domain-flag from the leading dot', () => {
    const out = convertToNetscape([{ ...sampleCookie, domain: 'example.com' }])
    const fields = out.trim().split('\n').pop()!.split('\t')
    expect(fields[1]).toBe('FALSE')
  })

  it('marks non-secure cookies as FALSE and defaults missing path/expiry', () => {
    const out = convertToNetscape([
      { name: 'a', value: 'b', domain: 'x.com', path: '', secure: false, httpOnly: false }
    ])
    const fields = out.trim().split('\n').pop()!.split('\t')
    expect(fields[2]).toBe('/') // path defaulted
    expect(fields[3]).toBe('FALSE') // not secure
    expect(fields[4]).toBe('0') // no expiry
  })

  it('floors fractional expiration dates', () => {
    const out = convertToNetscape([sampleCookie])
    expect(out).toContain('2000000000\t')
    expect(out).not.toContain('2000000000.5')
  })
})

describe('writeTempCookieFile / deleteTempCookieFile', () => {
  it('writes a readable temp file and removes it', async () => {
    const p = await writeTempCookieFile([sampleCookie])
    expect(fs.existsSync(p)).toBe(true)
    expect(fs.readFileSync(p, 'utf-8')).toContain('SID')
    await deleteTempCookieFile(p)
    expect(fs.existsSync(p)).toBe(false)
  })

  it('does not throw when deleting a missing file', async () => {
    await expect(deleteTempCookieFile('/nonexistent/vd-cookies-xyz.txt')).resolves.toBeUndefined()
  })
})
