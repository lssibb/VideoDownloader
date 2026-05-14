import { contextBridge, ipcRenderer } from 'electron'
import type { API, DownloadOptions, SettingsData } from '@shared/types'

const api: API = {
  downloadVideo: (options: DownloadOptions) => ipcRenderer.invoke('download-video', options),
  onDownloadLog: (callback) => {
    const handler = (_: unknown, line: string) => callback(line)
    ipcRenderer.on('download-log', handler)
    return () => ipcRenderer.removeListener('download-log', handler)
  },
  onDownloadComplete: (callback) => {
    const handler = (_: unknown, data: { filePath: string; title: string }) => callback(data)
    ipcRenderer.on('download-complete', handler)
    return () => ipcRenderer.removeListener('download-complete', handler)
  },

  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: Partial<SettingsData>) => ipcRenderer.invoke('set-settings', settings),

  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  openFolder: (filePath: string) => ipcRenderer.invoke('open-folder', filePath),

  selectFolder: () => ipcRenderer.invoke('select-folder'),
  updateYtDlp: () => ipcRenderer.invoke('update-ytdlp'),
  onUpdateLog: (callback) => {
    const handler = (_: unknown, line: string) => callback(line)
    ipcRenderer.on('update-log', handler)
    return () => ipcRenderer.removeListener('update-log', handler)
  },

  openAuthWindow: () => ipcRenderer.invoke('open-auth-window')
}

contextBridge.exposeInMainWorld('api', api)
