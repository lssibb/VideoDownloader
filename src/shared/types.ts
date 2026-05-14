export interface DownloadOptions {
  url: string
  format: 'best' | 'mp4' | 'audio'
  quality: 'best' | '1080' | '720' | '480' | 'audio'
  outputDir: string
  useCookies: boolean
}

export interface HistoryItem {
  id: number
  url: string
  title: string
  duration: string
  format: string
  quality: string
  filePath: string
  createdAt: string
}

export interface SettingsData {
  defaultDownloadPath: string
  useCookies: boolean
}

export interface API {
  downloadVideo: (options: DownloadOptions) => Promise<{ success: boolean; error?: string }>
  onDownloadLog: (callback: (line: string) => void) => () => void
  onDownloadComplete: (callback: (data: { filePath: string; title: string }) => void) => () => void

  getSettings: () => Promise<SettingsData>
  setSettings: (settings: Partial<SettingsData>) => Promise<void>

  getHistory: () => Promise<HistoryItem[]>
  clearHistory: () => Promise<void>
  openFile: (filePath: string) => Promise<void>
  openFolder: (filePath: string) => Promise<void>

  selectFolder: () => Promise<string | null>
  updateYtDlp: () => Promise<{ success: boolean; error?: string }>
  onUpdateLog: (callback: (line: string) => void) => () => void

  openAuthWindow: () => Promise<void>
}

declare global {
  interface Window {
    api: API
  }
}
