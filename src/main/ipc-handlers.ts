import { dialog, ipcMain, shell, BrowserWindow } from 'electron'
import { getPrismaClient } from './database'
import { startDownload } from './downloader'
import { openGoogleAuthWindow } from './auth'
import { updateYtDlp } from './updater'
import type { DownloadOptions, SettingsData } from '@shared/types'

export function registerIpcHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.handle('get-settings', async () => {
    const prisma = getPrismaClient()
    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({ data: {} })
    }
    return {
      defaultDownloadPath: settings.defaultDownloadPath,
      useCookies: settings.useCookies
    } as SettingsData
  })

  ipcMain.handle('set-settings', async (_, partial: Partial<SettingsData>) => {
    const prisma = getPrismaClient()
    const existing = await prisma.settings.findFirst()
    if (existing) {
      await prisma.settings.update({ where: { id: existing.id }, data: partial })
    } else {
      await prisma.settings.create({ data: partial })
    }
  })

  ipcMain.handle('get-history', async () => {
    const prisma = getPrismaClient()
    const items = await prisma.history.findMany({ orderBy: { createdAt: 'desc' } })
    return items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))
  })

  ipcMain.handle('clear-history', async () => {
    const prisma = getPrismaClient()
    await prisma.history.deleteMany()
  })

  ipcMain.handle('open-file', async (_, filePath: string) => {
    if (filePath) await shell.openPath(filePath)
  })

  ipcMain.handle('open-folder', async (_, filePath: string) => {
    if (filePath) await shell.showItemInFolder(filePath)
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  // Placeholder handlers for Phase 2+
  ipcMain.handle('download-video', async (_, options: DownloadOptions) => {
    return startDownload(options, mainWindow)
  })

  ipcMain.handle('update-ytdlp', async () => {
    if (!mainWindow) return { success: false, error: 'Window not available' }
    const result = await updateYtDlp(mainWindow, (line) => {
      mainWindow?.webContents.send('update-log', line)
    })
    return result
  })

  ipcMain.handle('open-auth-window', async () => {
    await openGoogleAuthWindow()
  })
}
