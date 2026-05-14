import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import type { DownloadOptions, SettingsData } from '@shared/types'

function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'best' | 'mp4' | 'audio'>('best')
  const [quality, setQuality] = useState<'best' | '1080' | '720' | '480' | 'audio'>('best')
  const [outputDir, setOutputDir] = useState('')
  const [useCookies, setUseCookies] = useState(false)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setOutputDir(s.defaultDownloadPath)
      setUseCookies(s.useCookies)
    })
  }, [])

  useEffect(() => {
    const unsubLog = window.api.onDownloadLog((line) => {
      setLogs((prev) => [...prev, line])
    })
    const unsubComplete = window.api.onDownloadComplete(() => {
      setDownloading(false)
    })
    return () => {
      unsubLog()
      unsubComplete()
    }
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      setOutputDir(folder)
      await window.api.setSettings({ defaultDownloadPath: folder })
    }
  }

  const handleDownload = async () => {
    if (!url.trim() || !outputDir) return
    setLogs([])
    setDownloading(true)
    const options: DownloadOptions = {
      url: url.trim(),
      format,
      quality,
      outputDir,
      useCookies
    }
    const result = await window.api.downloadVideo(options)
    if (!result.success) {
      setLogs((prev) => [...prev, `[error] ${result.error || 'Unknown error'}`])
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Video Downloader v2.0</h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="url">Video URL</Label>
        <Input
          id="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <RadioGroupItem value="best">Best</RadioGroupItem>
            <RadioGroupItem value="mp4">MP4</RadioGroupItem>
            <RadioGroupItem value="audio">Audio Only</RadioGroupItem>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Quality</Label>
          <RadioGroup value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
            <RadioGroupItem value="best">Best</RadioGroupItem>
            <RadioGroupItem value="1080">1080p</RadioGroupItem>
            <RadioGroupItem value="720">720p</RadioGroupItem>
            <RadioGroupItem value="480">480p</RadioGroupItem>
          </RadioGroup>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          label="Use Cookies"
          checked={useCookies}
          onChange={(e) => {
            const checked = (e.target as HTMLInputElement).checked
            setUseCookies(checked)
            window.api.setSettings({ useCookies: checked })
          }}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground truncate max-w-[300px]">
            {outputDir || 'No folder selected'}
          </span>
          <Button variant="outline" onClick={handleSelectFolder} disabled={downloading}>
            Select Folder
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleDownload} disabled={downloading || !url.trim() || !outputDir} className="flex-1">
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </div>

      <div className="flex-1 min-h-[200px] border rounded-md p-4 bg-muted">
        <Label className="mb-2 block">Console Output</Label>
        <ScrollArea className="h-[200px] w-full text-sm font-mono whitespace-pre-wrap">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          <div ref={logEndRef} />
        </ScrollArea>
      </div>
    </div>
  )
}

export default App
