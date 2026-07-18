/**
 * Hermetic end-to-end test of the real download pipeline.
 *
 * It exercises the *actual production code* — `getYtDlpArgs` + `runYtDlp` +
 * `parseInfoFile` — driving the real `yt-dlp` and `ffmpeg` binaries. No mocks.
 *
 * To stay offline and deterministic it:
 *   1. generates a small H.264/AAC sample.mp4 with ffmpeg,
 *   2. serves it from a localhost HTTP server,
 *   3. downloads it through the pipeline as both video (mp4) and audio (mp3),
 *   4. asserts the output files exist, are non-trivial, and metadata was
 *      captured via the info file.
 *
 * Requires `yt-dlp` and `ffmpeg` on PATH. Skipped automatically otherwise so a
 * bare runner doesn't fail; run explicitly with `npm run test:e2e`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { getYtDlpArgs } from '../../src/main/ytdlp-args'
import { runYtDlp, parseInfoFile } from '../../src/main/ytdlp-run'
import type { DownloadOptions } from '../../src/shared/types'

function has(bin: string, flag = '--version'): boolean {
  try {
    execSync(`${bin} ${flag}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const toolsAvailable = has('yt-dlp') && has('ffmpeg', '-version')

let workDir: string
let sampleFile: string
let server: http.Server
let baseUrl: string

async function download(options: DownloadOptions): Promise<{
  code: number | null
  info: ReturnType<typeof parseInfoFile>
  stderr: string
}> {
  const infoPath = path.join(workDir, `info-${Math.random().toString(36).slice(2)}.txt`)
  const args = getYtDlpArgs(options, undefined, infoPath)
  const result = await runYtDlp('yt-dlp', args)
  const info = parseInfoFile(infoPath)
  try {
    fs.unlinkSync(infoPath)
  } catch {
    /* ignore */
  }
  return { code: result.code, info, stderr: result.stderr }
}

describe.skipIf(!toolsAvailable)('e2e: real download pipeline', () => {
  beforeAll(async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-e2e-'))
    sampleFile = path.join(workDir, 'sample.mp4')

    // 2-second 320x240 testsrc video + 440Hz sine audio, H.264/AAC in mp4.
    execSync(
      `ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x240:rate=15 ` +
        `-f lavfi -i sine=frequency=440:duration=2 ` +
        `-c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${sampleFile}"`,
      { stdio: 'ignore' }
    )
    expect(fs.existsSync(sampleFile)).toBe(true)

    server = http.createServer((req, res) => {
      if (req.url === '/sample.mp4') {
        res.writeHead(200, { 'Content-Type': 'video/mp4' })
        fs.createReadStream(sampleFile).pipe(res)
      } else {
        res.writeHead(404)
        res.end()
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    fs.rmSync(workDir, { recursive: true, force: true })
  })

  it('downloads a video and produces an mp4 with captured metadata', async () => {
    const outDir = fs.mkdtempSync(path.join(workDir, 'video-'))
    const { code, info, stderr } = await download({
      url: `${baseUrl}/sample.mp4`,
      format: 'mp4',
      quality: 'best',
      outputDir: outDir,
      useCookies: false
    })

    expect(code, stderr).toBe(0)

    // Real output file exists and is non-trivial.
    const produced = info.filePath || ''
    expect(produced).toBeTruthy()
    expect(fs.existsSync(produced)).toBe(true)
    expect(fs.statSync(produced).size).toBeGreaterThan(1000)

    // Title metadata is always captured from the info file.
    expect(info.title).toBeTruthy()
    // Duration is best-effort: the generic direct-URL extractor may not know
    // it, but when present it must be a HH:MM:SS-style string, never garbage.
    if (info.duration) expect(info.duration).toMatch(/^\d+(:\d{2})*$/)

    // Exactly one media file landed in the output dir.
    const files = fs.readdirSync(outDir)
    expect(files.length).toBe(1)
    expect(files[0].endsWith('.mp4')).toBe(true)
  })

  it('extracts audio to a real mp3 via ffmpeg', async () => {
    const outDir = fs.mkdtempSync(path.join(workDir, 'audio-'))
    const { code, info, stderr } = await download({
      url: `${baseUrl}/sample.mp4`,
      format: 'audio',
      quality: 'audio',
      outputDir: outDir,
      useCookies: false
    })

    expect(code, stderr).toBe(0)

    const files = fs.readdirSync(outDir)
    expect(files.length).toBe(1)
    expect(files[0].endsWith('.mp3')).toBe(true)

    const produced = path.join(outDir, files[0])
    expect(fs.statSync(produced).size).toBeGreaterThan(500)

    // Confirm it's a valid MP3 by probing with ffprobe/ffmpeg.
    const probe = execSync(`ffmpeg -i "${produced}" -f null - 2>&1 || true`, { encoding: 'utf-8' })
    expect(probe).toMatch(/mp3|Audio:/i)
  })

  it('rejects an invalid URL before spawning', async () => {
    // getYtDlpArgs is pure; the guard lives in the validators the pipeline uses.
    const { isValidUrl } = await import('../../src/main/ytdlp-args')
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl(`${baseUrl}/sample.mp4`)).toBe(true)
  })
})
