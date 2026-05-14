import { BrowserWindow } from 'electron'

let authWindow: BrowserWindow | null = null

export function openGoogleAuthWindow(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.focus()
      return
    }

    authWindow = new BrowserWindow({
      width: 800,
      height: 900,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    authWindow.loadURL('https://accounts.google.com').catch((err) => {
      authWindow?.close()
      reject(err)
    })

    authWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      authWindow?.close()
      reject(new Error(`Navigation failed: ${errorDescription} (${errorCode})`))
    })

    authWindow.on('closed', () => {
      authWindow = null
      resolve()
    })

    authWindow.webContents.on('did-navigate', (_, url) => {
      if (url.startsWith('https://myaccount.google.com')) {
        authWindow?.close()
        resolve()
      }
    })
  })
}
