import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { BrowserWindow, session } from 'electron'
import { getPrismaClient } from './database'
import { getBinaryPath } from './utils/binary-path'
import { writeTempCookieFile, deleteTempCookieFile } from './netscape-cookie'
import { getYtDlpArgs, isValidUrl, isValidQuality } from './ytdlp-args'
import { runYtDlp, parseInfoFile } from './ytdlp-run'
import type { DownloadOptions } from '@shared/types'

function notifyLog(window: BrowserWindow | null, line: string): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send('download-log', line.replace(/\r/g, ''))
  }
}

function notifyComplete(
  window: BrowserWindow | null,
  data: { filePath: string; title: string }
): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send('download-complete', data)
  }
}

export async function startDownload(
  options: DownloadOptions,
  senderWindow: BrowserWindow | null
): Promise<{ success: boolean; error?: string; filePath?: string; title?: string }> {
  let cookiePath: string | undefined

  if (options.useCookies) {
    try {
      const ytCookies = await session.defaultSession.cookies.get({ domain: '.youtube.com' })
      const googleCookies = await session.defaultSession.cookies.get({ domain: '.google.com' })
      const allCookies = [...googleCookies, ...ytCookies]
      if (allCookies.length === 0) {
        notifyLog(senderWindow, '[warn] No cookies found. Proceeding without authentication.')
      } else {
        cookiePath = await writeTempCookieFile(allCookies as any)
        notifyLog(
          senderWindow,
          `[auth] Using ${allCookies.length} cookies (${googleCookies.length} Google, ${ytCookies.length} YouTube)`
        )
      }
    } catch (err) {
      notifyLog(senderWindow, `[warn] Failed to retrieve cookies: ${(err as Error).message}`)
    }
  }

  // Validate URL
  if (!isValidUrl(options.url)) {
    if (cookiePath) await deleteTempCookieFile(cookiePath)
    return { success: false, error: 'Invalid URL' }
  }

  // Validate quality
  if (!isValidQuality(options.quality)) {
    if (cookiePath) await deleteTempCookieFile(cookiePath)
    return { success: false, error: 'Invalid quality option' }
  }

  // Validate output directory
  try {
    if (!fs.existsSync(options.outputDir)) {
      throw new Error('Directory does not exist')
    }
    fs.accessSync(options.outputDir, fs.constants.W_OK)
  } catch {
    if (cookiePath) await deleteTempCookieFile(cookiePath)
    return { success: false, error: 'Invalid output directory' }
  }

  const infoPath = path.join(
    os.tmpdir(),
    `vd-info-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  )
  const binaryPath = getBinaryPath('yt-dlp')
  const args = getYtDlpArgs(options, cookiePath, infoPath)

  const cleanup = async (): Promise<void> => {
    if (cookiePath) await deleteTempCookieFile(cookiePath)
    try {
      await fs.promises.unlink(infoPath)
    } catch {
      // ignore
    }
  }

  notifyLog(senderWindow, `[yt-dlp] Starting download from ${options.url}`)
  const logArgs = cookiePath ? args.map((a) => (a === cookiePath ? '[REDACTED]' : a)) : args
  notifyLog(senderWindow, `[yt-dlp] Command: ${binaryPath} ${logArgs.join(' ')}`)

  let result
  try {
    result = await runYtDlp(binaryPath, args, (line) => notifyLog(senderWindow, `[yt-dlp] ${line}`))
  } catch (err) {
    await cleanup()
    const msg = (err as Error).message
    notifyLog(senderWindow, `[error] ${msg}`)
    return { success: false, error: msg }
  }

  if (result.code !== 0) {
    await cleanup()
    const errMsg = result.stderr.trim() || `yt-dlp exited with code ${result.code}`
    notifyLog(senderWindow, `[error] ${errMsg}`)
    return { success: false, error: errMsg }
  }

  const info = parseInfoFile(infoPath)

  // Fall back to parsing stdout if the info file is unavailable.
  const titleMatch = result.stdout.match(/\[download\] Destination: (.+)/)
  const fallbackTitle = titleMatch
    ? path.basename(titleMatch[1], path.extname(titleMatch[1]))
    : 'Unknown'
  const ext = options.format === 'audio' ? 'mp3' : 'mp4'

  const title = info.title || fallbackTitle
  const filePath = info.filePath || path.join(options.outputDir, `${title}.${ext}`)
  const duration = info.duration || ''

  await cleanup()

  // Persist to history
  try {
    const prisma = getPrismaClient()
    await prisma.history.create({
      data: {
        url: options.url,
        title,
        duration,
        format: options.format,
        quality: options.quality,
        filePath
      }
    })
  } catch (dbErr) {
    const dbErrorMsg = (dbErr as Error).message
    console.error('[db] Failed to write history:', dbErrorMsg)
    notifyLog(senderWindow, `[error] Failed to save download history: ${dbErrorMsg}`)
    return { success: false, error: dbErrorMsg }
  }

  notifyComplete(senderWindow, { filePath, title })
  return { success: true, filePath, title }
}
