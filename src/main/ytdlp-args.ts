import path from 'node:path'
import type { DownloadOptions } from '@shared/types'

export const ALLOWED_QUALITIES = ['best', '1080', '720', '480', 'audio'] as const

/**
 * Delimiter used with `--print-to-file` so a single line can carry
 * multiple metadata fields (title, duration, final filepath).
 */
export const INFO_SEP = '' // ASCII unit separator — never appears in titles

/**
 * Field template printed to the info file after a successful download.
 * `after_move` guarantees `filepath` points at the final, merged file.
 */
export const INFO_TEMPLATE = `after_move:%(title)s${INFO_SEP}%(duration_string)s${INFO_SEP}%(filepath)s`

export function isValidUrl(url: string): boolean {
  return /^https?:\/\//.test(url) && !url.startsWith('-')
}

export function isValidQuality(quality: string): boolean {
  return (ALLOWED_QUALITIES as readonly string[]).includes(quality)
}

/**
 * Build the yt-dlp argument list for the given download options.
 * Pure function — no Electron / filesystem side effects — so it can be
 * unit-tested in isolation.
 *
 * @param infoFilePath  optional path passed to `--print-to-file` to capture
 *                      title/duration/filepath after the download completes.
 */
export function getYtDlpArgs(
  options: DownloadOptions,
  cookiePath?: string,
  infoFilePath?: string
): string[] {
  const args: string[] = [options.url]

  // Format / Quality selection
  if (options.format === 'audio') {
    args.push('-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3')
  } else if (options.format === 'mp4') {
    // Explicitly prefer mp4-compatible streams so the output is a "pure" mp4.
    if (options.quality === 'best') {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best')
    } else {
      const h = options.quality
      args.push(
        '-f',
        `bestvideo[ext=mp4][height<=${h}]+bestaudio[ext=m4a]/best[ext=mp4][height<=${h}]/best[height<=${h}]`
      )
    }
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

  if (infoFilePath) {
    // Capture real metadata after the file is fully written/moved.
    // --print-to-file implies --simulate, so re-enable the actual download.
    args.push('--print-to-file', INFO_TEMPLATE, infoFilePath, '--no-simulate')
  }

  // Progress
  args.push('--newline')
  args.push('--no-warnings')

  return args
}
