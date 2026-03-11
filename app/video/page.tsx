"use client"

import { useState, useRef, useCallback } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

interface Detection {
  frame: number
  label: string
  confidence: number
}

interface ApiDetection {
  class_name: string
  class_name_zh: string
  confidence: number
  bbox: number[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function VideoDetectionPage() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [detections, setDetections] = useState<Detection[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [stats, setStats] = useState({ totalFrames: 0, detectedFrames: 0, avgConfidence: 0 })
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const extractFrames = (video: HTMLVideoElement, totalFrames: number): Promise<string[]> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current || document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const frames: string[] = []
      const duration = video.duration
      const interval = duration / totalFrames
      let currentIndex = 0

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const captureFrame = () => {
        if (currentIndex >= totalFrames) {
          resolve(frames)
          return
        }
        video.currentTime = currentIndex * interval
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(canvas.toDataURL("image/jpeg", 0.6).split(",")[1])
        currentIndex++
        captureFrame()
      }

      captureFrame()
    })
  }

  const processVideo = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setIsProcessing(true)
    setProgress(0)
    setDetections([])
    setError(null)

    try {
      // 等待视频元数据加载
      const video = videoRef.current!
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve()
        video.src = url
      })

      const SAMPLE_FRAMES = 20 // 每个视频抽取20帧送检
      const allDetections: Detection[] = []

      const frames = await extractFrames(video, SAMPLE_FRAMES)

      for (let i = 0; i < frames.length; i++) {
        setProgress(((i + 1) / frames.length) * 100)

        try {
          const response = await fetch(`${API_BASE}/camera_frame`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({ image: frames[i], run_diagnosis: false }),
          })

          if (response.ok) {
            const data = await response.json()
            ;(data.detections || []).forEach((d: ApiDetection) => {
              allDetections.push({
                frame: i + 1,
                label: d.class_name_zh || d.class_name,
                confidence: d.confidence,
              })
            })
          }
        } catch {
          // 某帧失败继续
        }
      }

      setDetections(allDetections)
      const avgConf = allDetections.length > 0
        ? allDetections.reduce((sum, d) => sum + d.confidence, 0) / allDetections.length
        : 0
      setStats({
        totalFrames: SAMPLE_FRAMES,
        detectedFrames: allDetections.length,
        avgConfidence: avgConf,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "视频处理失败")
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("video/")) processVideo(file)
  }, [processVideo])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processVideo(file)
  }

  const resetVideo = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc)
    setVideoSrc(null)
    setDetections([])
    setProgress(0)
    setError(null)
    setStats({ totalFrames: 0, detectedFrames: 0, avgConfidence: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const groupedDetections = detections.reduce((acc, det) => {
    if (!acc[det.label]) acc[det.label] = []
    acc[det.label].push(det)
    return acc
  }, {} as Record<string, Detection[]>)

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />
      {/* 隐藏的帧提取 canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">视频</span>{" "}
              <span className="text-primary neon-text">检测</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              上传视频文件进行全面的逐帧病害分析
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Video Upload/Player */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">视频输入</h2>

              {!videoSrc ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    isDragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <p className="text-foreground font-medium mb-2">拖拽或点击上传视频</p>
                  <p className="text-sm text-muted-foreground">支持 MP4、WEBM、MOV 格式</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-secondary/30 rounded-xl overflow-hidden">
                    <video ref={videoRef} src={videoSrc} controls className="w-full h-full object-contain" />
                    <button onClick={resetVideo} className="absolute top-4 right-4 p-2 rounded-lg bg-background/80 hover:bg-background text-foreground transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">正在处理帧...</span>
                        <span className="text-primary font-mono">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-2 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      ⚠️ {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Panel */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">分析结果</h2>

              {detections.length === 0 && !isProcessing ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">请上传视频以查看分析结果</p>
                </div>
              ) : isProcessing ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-primary font-medium">YOLOv26 正在分析视频...</p>
                  <p className="text-sm text-muted-foreground mt-2">逐帧发送后端检测中</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-secondary/30 text-center">
                      <div className="text-2xl font-bold text-primary">{stats.totalFrames}</div>
                      <div className="text-xs text-muted-foreground">总帧数</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30 text-center">
                      <div className="text-2xl font-bold text-primary">{stats.detectedFrames}</div>
                      <div className="text-xs text-muted-foreground">检测数</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30 text-center">
                      <div className="text-2xl font-bold text-primary">{(stats.avgConfidence * 100).toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">平均置信度</div>
                    </div>
                  </div>

                  {Object.keys(groupedDetections).length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">病害分布</h3>
                      {Object.entries(groupedDetections).map(([label, dets]) => (
                        <div key={label} className="p-3 rounded-xl bg-secondary/30 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{label}</span>
                            <span className="text-xs text-primary">{dets.length} 次检测</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(dets.length / stats.detectedFrames) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      未检测到病害
                    </div>
                  )}

                  <button onClick={() => window.location.href = "/diagnosis"} className="w-full mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300">
                    查看病害详情
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
