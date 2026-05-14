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

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
  }

  const loadHistory = async () => {
    try {
      const items = await window.api.getHistory()
      setHistory(items)
    } catch (err) {
      addLog(`[error] Failed to load history: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setOutputDir(s.defaultDownloadPath)
      setUseCookies(s.useCookies)
    }).catch((err) => {
      addLog(`[error] Failed to get settings: ${err instanceof Error ? err.message : String(err)}`)
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
    try {
      const folder = await window.api.selectFolder()
      if (folder) {
        setOutputDir(folder)
        await window.api.setSettings({ defaultDownloadPath: folder })
      }
    } catch (err) {
      addLog(`[error] Failed to select folder: ${err instanceof Error ? err.message : String(err)}`)
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
    try {
      const result = await window.api.downloadVideo(options)
      if (!result.success) {
        setLogs((prev) => [...prev, `[error] ${result.error || 'Unknown error'}`])
        setDownloading(false)
      }
    } catch (err) {
      setLogs((prev) => [...prev, `[error] Download failed: ${err instanceof Error ? err.message : String(err)}`])
      setDownloading(false)
    }
  }

  const handleUpdateYtDlp = async () => {
    setUpdating(true)
    setUpdateLogs([])
    try {
      const result = await window.api.updateYtDlp()
      if (!result.success) {
        setUpdateLogs((prev) => [...prev, `[error] ${result.error || 'Update failed'}`])
      }
    } catch (err) {
      setUpdateLogs((prev) => [...prev, `[error] Update failed: ${err instanceof Error ? err.message : String(err)}`])
    }
    setUpdating(false)
  }

  const handleClearHistory = async () => {
    try {
      await window.api.clearHistory()
      setHistory([])
    } catch (err) {
      addLog(`[error] Failed to clear history: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleOpenAuthWindow = async () => {
    try {
      await window.api.openAuthWindow()
    } catch (err) {
      addLog(`[error] Failed to open auth window: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      await window.api.openFile(filePath)
    } catch (err) {
      addLog(`[error] Failed to open file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleOpenFolder = async (filePath: string) => {
    try {
      await window.api.openFolder(filePath)
    } catch (err) {
      addLog(`[error] Failed to open folder: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleSetSettings = async (partial: Partial<SettingsData>) => {
    try {
      await window.api.setSettings(partial)
    } catch (err) {
      addLog(`[error] Failed to save settings: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const qualityOptions = format === 'audio'
    ? [{ value: 'audio' as const, label: 'AUDIO' }]
    : [
        { value: 'best' as const, label: 'BEST' },
        { value: '1080' as const, label: '1080P' },
        { value: '720' as const, label: '720P' },
        { value: '480' as const, label: '480P' }
      ]

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-8">

        {/* Header */}
        <header className="anim-in anim-d1 flex flex-col items-start gap-1 border-b border-border pb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-[4rem] md:text-[5.5rem] leading-none text-primary">
              VIDEO DOWNLOADER
            </h1>
            <span className="font-mono text-xs text-muted-foreground tracking-widest mt-auto mb-2">
              V2.0
            </span>
          </div>
          <p className="font-mono text-sm text-muted-foreground tracking-wide">
            EXTRACT. CONVERT. ARCHIVE.
          </p>
        </header>

        {/* URL Input */}
        <section className="anim-in anim-d2 flex flex-col gap-3">
          <Label htmlFor="url" className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Target URL
          </Label>
          <Input
            id="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="font-mono text-sm h-12 bg-card border-border focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
          />
        </section>

        {/* Format & Quality */}
        <section className="anim-in anim-d3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <Label className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Format
            </Label>
            <RadioGroup
              name="format"
              value={format}
              onValueChange={(v) => {
                setFormat(v as typeof format)
                if (v === 'audio') setQuality('audio')
                else if (quality === 'audio') setQuality('best')
              }}
              className="flex gap-2"
            >
              {([
                { value: 'best', label: 'BEST' },
                { value: 'mp4', label: 'MP4' },
                { value: 'audio', label: 'AUDIO' }
              ]).map((opt) => (
                <label
                  key={opt.value}
                  className={`
                    flex-1 cursor-pointer select-none text-center font-mono text-xs tracking-wider py-2.5 px-3 border transition-all duration-200
                    ${format === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'}
                  `}
                >
                  <RadioGroupItem value={opt.value} className="sr-only" />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Quality
            </Label>
            <RadioGroup
              name="quality"
              value={quality}
              onValueChange={(v) => setQuality(v as typeof quality)}
              className="flex gap-2"
            >
              {qualityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`
                    flex-1 cursor-pointer select-none text-center font-mono text-xs tracking-wider py-2.5 px-2 border transition-all duration-200
                    ${quality === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'}
                  `}
                >
                  <RadioGroupItem value={opt.value} className="sr-only" />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        </section>

        {/* Controls Row */}
        <section className="anim-in anim-d4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={useCookies}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.checked
                  setUseCookies(value)
                  handleSetSettings({ useCookies: value })
                }}
                className="border-muted-foreground/30 accent-primary"
              />
              <span className="font-mono text-xs tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">
                USE COOKIES
              </span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAuthWindow}
              className="font-mono text-xs tracking-wider border-border bg-card hover:bg-secondary hover:border-muted-foreground/30"
            >
              LOGIN
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[260px]">
              {outputDir || 'NO OUTPUT DIRECTORY'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectFolder}
              disabled={downloading}
              className="font-mono text-xs tracking-wider border-border bg-card hover:bg-secondary hover:border-muted-foreground/30 shrink-0"
            >
              BROWSE
            </Button>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="anim-in anim-d5 flex gap-3">
          <Button
            onClick={handleDownload}
            disabled={downloading || !url.trim() || !outputDir}
            className="flex-1 h-12 font-display text-xl tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 ember-glow ember-pulse disabled:opacity-40 disabled:animate-none"
          >
            {downloading ? 'PROCESSING...' : 'INITIATE DOWNLOAD'}
          </Button>
          <Button
            variant="outline"
            onClick={handleUpdateYtDlp}
            disabled={updating}
            className="h-12 px-5 font-mono text-xs tracking-wider border-border bg-card hover:bg-secondary hover:border-muted-foreground/30 disabled:opacity-40"
          >
            {updating ? 'UPDATING...' : 'UPDATE YT-DLP'}
          </Button>
        </section>

        {/* Update Logs */}
        {updateLogs.length > 0 && (
          <div className="anim-in anim-d5 font-mono text-xs bg-card border border-border p-3 max-h-[120px] overflow-auto text-muted-foreground">
            {updateLogs.map((log, i) => <div key={i} className="leading-relaxed">{log}</div>)}
          </div>
        )}

        {/* Console Output */}
        <section className="anim-in anim-d6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              System Log
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                {downloading ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
          </div>
          <div className="crt-screen rounded-sm">
            <ScrollArea className="h-[220px] w-full text-xs font-mono p-4 relative z-10">
              {logs.length === 0 ? (
                <span className="text-muted-foreground/30 italic">Awaiting command...</span>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`
                      leading-relaxed break-all
                      ${log.startsWith('[error]') ? 'text-red-400' : ''}
                      ${log.startsWith('[warn]') ? 'text-amber-400/80' : ''}
                      ${log.startsWith('[auth]') ? 'text-primary' : ''}
                      ${log.startsWith('[yt-dlp]') && log.includes('%') ? 'text-emerald-400' : ''}
                    `}
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </ScrollArea>
          </div>
        </section>

        {/* History */}
        <section className="anim-in anim-d6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-display text-2xl tracking-wider text-foreground">
              ARCHIVE
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={history.length === 0}
              className="font-mono text-xs tracking-wider border-border bg-card hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive disabled:opacity-30"
            >
              PURGE
            </Button>
          </div>

          {history.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground/50 tracking-wide py-4">
              NO RECORDS FOUND.
            </p>
          ) : (
            <div className="border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Title</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase w-[80px]">Format</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase w-[80px]">Quality</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase w-[140px]">Date</TableHead>
                    <TableHead className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} className="border-border hover:bg-primary/5 transition-colors">
                      <TableCell className="font-mono text-xs max-w-[180px] truncate" title={item.title}>
                        {item.title || 'UNKNOWN'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground uppercase">{item.format}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground uppercase">{item.quality}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFile(item.filePath)}
                            className="font-mono text-[10px] tracking-wider h-7 px-2 hover:text-primary hover:bg-primary/10"
                          >
                            OPEN
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFolder(item.filePath)}
                            className="font-mono text-[10px] tracking-wider h-7 px-2 hover:text-primary hover:bg-primary/10"
                          >
                            FOLDER
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-border">
          <p className="font-mono text-[10px] text-muted-foreground/40 tracking-widest text-center">
            POWERED BY YT-DLP · ELECTRON · REACT
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
