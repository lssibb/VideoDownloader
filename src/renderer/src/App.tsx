import { useEffect, useState } from 'react'
import type { SettingsData } from '@shared/types'

function App() {
  const [settings, setSettings] = useState<SettingsData | null>(null)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-4">Video Downloader v2.0</h1>
      <p className="text-muted-foreground">
        Default path: {settings?.defaultDownloadPath || 'Not set'}
      </p>
      <p className="text-muted-foreground">
        Use cookies: {settings?.useCookies ? 'Yes' : 'No'}
      </p>
    </div>
  )
}

export default App
