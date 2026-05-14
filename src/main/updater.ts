import https from 'node:https'
import fs from 'node:fs'
import { BrowserWindow } from 'electron'
import { getBinaryPath } from './utils/binary-path'

function httpsGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'VideoDownloader/2.0' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function downloadFile(url: string, dest: string, onProgress?: (msg: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    file.on('error', (err) => {
      file.close()
      fs.unlink(dest, () => {})
      reject(err)
    })
    https.get(url, { headers: { 'User-Agent': 'VideoDownloader/2.0' } }, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        downloadFile(res.headers.location, dest, onProgress).then(resolve).catch(reject)
        return
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        file.close()
        fs.unlink(dest, () => {})
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (total && onProgress) {
          const pct = ((downloaded / total) * 100).toFixed(1)
          onProgress(`Downloaded ${pct}%`)
        }
      })
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

export async function updateYtDlp(
  _senderWindow: BrowserWindow | null,
  onLog: (line: string) => void
): Promise<{ success: boolean; error?: string }> {
  const binaryPath = getBinaryPath('yt-dlp')
  const backupPath = `${binaryPath}.backup`
  const tempPath = `${binaryPath}.tmp`

  try {
    onLog('[updater] Checking GitHub for latest yt-dlp release...')
    const release = await httpsGetJson('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest')
    const version = release.tag_name
    onLog(`[updater] Latest version: ${version}`)

    const asset = release.assets?.find((a: any) => a.name === 'yt-dlp.exe')
    if (!asset) {
      return { success: false, error: 'yt-dlp.exe asset not found in release' }
    }

    // Backup existing
    if (fs.existsSync(binaryPath)) {
      fs.copyFileSync(binaryPath, backupPath)
      onLog('[updater] Existing binary backed up')
    }

    // Download new binary
    await downloadFile(asset.browser_download_url, tempPath, (msg) => onLog(`[updater] ${msg}`))

    // Replace
    fs.renameSync(tempPath, binaryPath)
    fs.chmodSync(binaryPath, 0o755)

    // Remove backup
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }

    onLog(`[updater] Successfully updated to ${version}`)
    return { success: true }
  } catch (err) {
    const msg = (err as Error).message
    onLog(`[updater] Error: ${msg}`)

    if (fs.existsSync(backupPath)) {
      try {
        fs.renameSync(backupPath, binaryPath)
        onLog('[updater] Restored backup binary')
      } catch (e) {
        onLog(`[updater] Failed to restore backup: ${(e as Error).message}`)
      }
    }

    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath)
      } catch (e) {
        // ignore
      }
    }

    return { success: false, error: msg }
  }
}
