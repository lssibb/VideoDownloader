import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

function getBinaryName(base: string): string {
  return process.platform === 'win32' ? `${base}.exe` : base
}

export function getBinaryPath(base: string): string {
  const binaryName = getBinaryName(base)

  // Production: bundled in resources/bin/
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', binaryName)
  }

  // Dev: check local resources/bin first
  const localPath = path.join(process.cwd(), 'resources', 'bin', binaryName)
  if (fs.existsSync(localPath)) {
    return localPath
  }

  // Dev fallback: PATH
  return binaryName
}
