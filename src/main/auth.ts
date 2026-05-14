import { BrowserWindow } from 'electron'

let authWindow: BrowserWindow | null = null

export function openGoogleAuthWindow(): Promise<void> {
  return new Promise((resolve) => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.focus()
      return
    }

    authWindow = new BrowserWindow({
      width: 800,
      height: 900,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    authWindow.loadURL('https://accounts.google.com')

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
