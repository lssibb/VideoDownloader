import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { INFO_SEP } from './ytdlp-args'

export interface YtDlpResult {
  code: number | null
  stdout: string
  stderr: string
}

export interface DownloadInfo {
  title?: string
  duration?: string
  filePath?: string
}

/**
 * Spawn yt-dlp and stream its output. Pure (no Electron): the caller supplies
 * an `onLine` sink so both the Electron main process and tests can reuse it.
 */
export function runYtDlp(
  binaryPath: string,
  args: string[],
  onLine?: (line: string) => void
): Promise<YtDlpResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, args, { shell: false })
    let stdout = ''
    let stderr = ''

    const pump = (chunk: Buffer, sink: 'out' | 'err'): void => {
      const text = chunk.toString()
      if (sink === 'out') stdout += text
      else stderr += text
      if (onLine) {
        text.split('\n').forEach((line) => {
          if (line.trim()) onLine(line.trim())
        })
      }
    }

    proc.stdout.on('data', (d: Buffer) => pump(d, 'out'))
    proc.stderr.on('data', (d: Buffer) => pump(d, 'err'))
    proc.on('error', reject)
    proc.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

/**
 * Parse the single info line written by yt-dlp's `--print-to-file`.
 * Returns best-effort title / duration / final filepath.
 */
export function parseInfoFile(infoPath: string): DownloadInfo {
  try {
    const raw = fs.readFileSync(infoPath, 'utf-8').trim()
    if (!raw) return {}
    const line = raw.split('\n').filter((l) => l.trim()).pop() ?? ''
    const [title, duration, filePath] = line.split(INFO_SEP)
    return {
      title: title || undefined,
      duration: duration && duration !== 'NA' ? duration : undefined,
      filePath: filePath || undefined
    }
  } catch {
    return {}
  }
}
