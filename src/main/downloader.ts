import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow, session } from 'electron'
import { getPrismaClient } from './database'
import { getBinaryPath } from './utils/binary-path'
import { writeTempCookieFile, deleteTempCookieFile } from './netscape-cookie'
import type { DownloadOptions } from '@shared/types'

function getYtDlpArgs(options: DownloadOptions, cookiePath?: string): string[] {
  const args: string[] = [options.url]

  // Format / Quality selection
  if (options.format === 'audio') {
    args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3')
  } else if (options.quality === 'best') {
    args.push('-f', 'bestvideo*+bestaudio/best')
  } else {
    const height = options.quality
    args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`)
  }

  // Output template
  const outTemplate = path.join(options.outputDir, '%(title)s.%(ext)s')
  args.push('-o', outTemplate)

  // Merge output format for video
  if (options.format !== 'audio') {
    args.push('--merge-output-format', 'mp4')
  }

  if (cookiePath) {
    args.push('--cookies', cookiePath)
  }

  // Progress
  args.push('--newline')
  args.push('--no-warnings')

  return args
}

function notifyLog(window: BrowserWindow | null, line: string): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send('download-log', line.replace(/\r/g, ''))
  }
}

function notifyComplete(window: BrowserWindow | null, data: { filePath: string; title: string }): void {
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
      const cookies = await session.defaultSession.cookies.get({ domain: '.youtube.com' })
      if (cookies.length === 0) {
        notifyLog(senderWindow, '[warn] No YouTube cookies found. Proceeding without authentication.')
      } else {
        cookiePath = await writeTempCookieFile(cookies as any)
        notifyLog(senderWindow, `[auth] Using ${cookies.length} YouTube cookies`)
      }
    } catch (err) {
      notifyLog(senderWindow, `[warn] Failed to retrieve cookies: ${(err as Error).message}`)
    }
  }

  // Validate URL
  if (!/^https?:\/\//.test(options.url) || options.url.startsWith('-')) {
    return { success: false, error: 'Invalid URL' }
  }

  // Validate quality
  const allowedQualities = ['best', '1080', '720', '480', 'audio']
  if (!allowedQualities.includes(options.quality)) {
    return { success: false, error: 'Invalid quality option' }
  }

  // Validate output directory
  try {
    if (!fs.existsSync(options.outputDir)) {
      throw new Error('Directory does not exist')
    }
    fs.accessSync(options.outputDir, fs.constants.W_OK)
  } catch {
    return { success: false, error: 'Invalid output directory' }
  }

  return new Promise((resolve) => {
    const binaryPath = getBinaryPath('yt-dlp')
    const args = getYtDlpArgs(options, cookiePath)

    notifyLog(senderWindow, `[yt-dlp] Starting download from ${options.url}`)
    const logArgs = cookiePath ? args.map((a) => (a === cookiePath ? '[REDACTED]' : a)) : args
    notifyLog(senderWindow, `[yt-dlp] Command: ${binaryPath} ${logArgs.join(' ')}`)

    const proc = spawn(binaryPath, args, { shell: false })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stdout += chunk
      chunk.split('\n').forEach((line) => {
        if (line.trim()) notifyLog(senderWindow, `[yt-dlp] ${line.trim()}`)
      })
    })

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stderr += chunk
      chunk.split('\n').forEach((line) => {
        if (line.trim()) notifyLog(senderWindow, `[yt-dlp] ${line.trim()}`)
      })
    })

    proc.on('error', async (err) => {
      if (cookiePath) await deleteTempCookieFile(cookiePath)
      notifyLog(senderWindow, `[error] ${err.message}`)
      resolve({ success: false, error: err.message })
    })

    proc.on('close', async (code) => {
      if (cookiePath) await deleteTempCookieFile(cookiePath)
      if (code === 0) {
        // Try to extract title from stdout
        const titleMatch = stdout.match(/\[download\] Destination: (.+)/)
        const title = titleMatch ? path.basename(titleMatch[1], path.extname(titleMatch[1])) : 'Unknown'
        const ext = options.format === 'audio' ? 'mp3' : 'mp4'
        const filePath = path.join(options.outputDir, `${title}.${ext}`)

        // Persist to history
        try {
          const prisma = getPrismaClient()
          await prisma.history.create({
            data: {
              url: options.url,
              title,
              duration: '',
              format: options.format,
              quality: options.quality,
              filePath
            }
          })
        } catch (dbErr) {
          const dbErrorMsg = (dbErr as Error).message
          console.error('[db] Failed to write history:', dbErrorMsg)
          notifyLog(senderWindow, `[error] Failed to save download history: ${dbErrorMsg}`)
          resolve({ success: false, error: dbErrorMsg })
          return
        }

        notifyComplete(senderWindow, { filePath, title })
        resolve({ success: true, filePath, title })
      } else {
        const errMsg = stderr.trim() || `yt-dlp exited with code ${code}`
        notifyLog(senderWindow, `[error] ${errMsg}`)
        resolve({ success: false, error: errMsg })
      }
    })
  })
}
