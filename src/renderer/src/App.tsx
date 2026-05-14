import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { DownloadOptions, HistoryItem, SettingsData } from '@shared/types'

function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'best' | 'mp4' | 'audio'>('best')
  const [quality, setQuality] = useState<'best' | '1080' | '720' | '480' | 'audio'>('best')
  const [outputDir, setOutputDir] = useState('')
  const [useCookies, setUseCookies] = useState(false)
  const [, setSettings] = useState<SettingsData | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [updating, setUpdating] = useState(false)
  const [updateLogs, setUpdateLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  const loadHistory = async () => {
    const items = await window.api.getHistory()
    setHistory(items)
  }

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setOutputDir(s.defaultDownloadPath)
      setUseCookies(s.useCookies)
    })
    loadHistory()
  }, [])

  useEffect(() => {
    const unsubLog = window.api.onDownloadLog((line) => {
      setLogs((prev) => [...prev, line])
    })
    const unsubComplete = window.api.onDownloadComplete(() => {
      setDownloading(false)
      loadHistory()
    })
    const unsubUpdate = window.api.onUpdateLog((line) => {
      setUpdateLogs((prev) => [...prev, line])
    })
    return () => {
      unsubLog()
      unsubComplete()
      unsubUpdate()
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

  const handleUpdateYtDlp = async () => {
    setUpdating(true)
    setUpdateLogs([])
    const result = await window.api.updateYtDlp()
    if (!result.success) {
      setUpdateLogs((prev) => [...prev, `[error] ${result.error || 'Update failed'}`])
    }
    setUpdating(false)
  }

  const handleClearHistory = async () => {
    await window.api.clearHistory()
    setHistory([])
  }

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col gap-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Video Downloader v2.0</h1>

      {/* Download Form */}
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
        <div className="flex items-center gap-4">
          <Checkbox
            label="Use Cookies"
            checked={useCookies}
            onChange={(e) => {
              const checked = (e.target as HTMLInputElement).checked
              setUseCookies(checked)
              window.api.setSettings({ useCookies: checked })
            }}
          />
          <Button variant="outline" size="sm" onClick={() => window.api.openAuthWindow()}>
            Login to Google
          </Button>
        </div>

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
        <Button variant="outline" onClick={handleUpdateYtDlp} disabled={updating}>
          {updating ? 'Updating...' : 'Update yt-dlp'}
        </Button>
      </div>

      {updateLogs.length > 0 && (
        <div className="text-sm font-mono bg-muted p-2 rounded max-h-[150px] overflow-auto">
          {updateLogs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}

      {/* Console Output */}
      <div className="flex-1 min-h-[200px] border rounded-md p-4 bg-muted">
        <Label className="mb-2 block">Console Output</Label>
        <ScrollArea className="h-[200px] w-full text-sm font-mono whitespace-pre-wrap">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          <div ref={logEndRef} />
        </ScrollArea>
      </div>

      {/* History Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Download History</h2>
          <Button variant="outline" size="sm" onClick={handleClearHistory} disabled={history.length === 0}>
            Clear History
          </Button>
        </div>

        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No downloads yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={item.title}>
                    {item.title || 'Unknown'}
                  </TableCell>
                  <TableCell>{item.format}</TableCell>
                  <TableCell>{item.quality}</TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.api.openFile(item.filePath)}>
                        Open
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => window.api.openFolder(item.filePath)}>
                        Folder
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

export default App
