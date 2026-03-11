"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

interface Detection {
  label: string
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
}

interface ApiDetection {
  class_name: string
  class_name_zh: string
  confidence: number
  bbox: number[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function CameraDetectionPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [fps, setFps] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const detectingRef = useRef(false)
  const lastDetectionsRef = useRef<Detection[]>([])

  const captureFrame = (): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL("image/jpeg", 0.7).split(",")[1]
  }

  const sendFrameToBackend = useCallback(async () => {
    if (detectingRef.current) return
    detectingRef.current = true
    setIsDetecting(true)

    try {
      const base64 = captureFrame()
      if (!base64) return

      const response = await fetch(`${API_BASE}/camera_frame`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ image: base64, run_diagnosis: false }),
      })

      if (!response.ok) return

      const data = await response.json()
      const parsed: Detection[] = (data.detections || []).map((d: ApiDetection) => ({
        label: d.class_name_zh || d.class_name,
        confidence: d.confidence,
        bbox: { x: d.bbox[0], y: d.bbox[1], width: d.bbox[2], height: d.bbox[3] },
      }))

      lastDetectionsRef.current = parsed
      setDetections(parsed)
    } catch {
      // 静默失败，继续下一帧
    } finally {
      detectingRef.current = false
      setIsDetecting(false)
    }
  }, [])

  const drawOverlay = useCallback(() => {
    const video = videoRef.current
    const canvas = overlayCanvasRef.current
    if (!video || !canvas || !isStreaming) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    lastDetectionsRef.current.forEach((det) => {
      ctx.strokeStyle = "#4ade80"
      ctx.lineWidth = 3
      ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height)

      const labelText = `${det.label} ${(det.confidence * 100).toFixed(0)}%`
      ctx.font = "bold 14px Inter, sans-serif"
      const textWidth = ctx.measureText(labelText).width
      ctx.fillStyle = "rgba(74, 222, 128, 0.9)"
      ctx.fillRect(det.bbox.x, det.bbox.y - 24, textWidth + 12, 24)
      ctx.fillStyle = "#000"
      ctx.fillText(labelText, det.bbox.x + 6, det.bbox.y - 7)
    })

    frameCountRef.current++
    const now = performance.now()
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current)
      frameCountRef.current = 0
      lastTimeRef.current = now
      // 每秒发送一帧给后端
      sendFrameToBackend()
    }

    animationRef.current = requestAnimationFrame(drawOverlay)
  }, [isStreaming, sendFrameToBackend])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
        setHasPermission(true)
      }
    } catch {
      setHasPermission(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    setIsStreaming(false)
    setDetections([])
    lastDetectionsRef.current = []
    setFps(0)
  }

  useEffect(() => {
    if (isStreaming) animationRef.current = requestAnimationFrame(drawOverlay)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [isStreaming, drawOverlay])

  useEffect(() => { return () => { stopCamera() } }, [])

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">摄像头</span>{" "}
              <span className="text-primary neon-text">检测</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              使用设备摄像头进行实时玉米病害检测，AI实时分析
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Camera View */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">实时画面</h2>
                <div className="flex items-center gap-4">
                  {isStreaming && (
                    <>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400">直播中</span>
                      </span>
                      <span className="text-sm text-muted-foreground font-mono">{fps} FPS</span>
                      {isDetecting && (
                        <span className="text-xs text-primary animate-pulse">检测中...</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="relative aspect-video bg-secondary/30 rounded-xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: isStreaming ? "block" : "none" }}
                />
                {/* 隐藏的捕帧 canvas */}
                <canvas ref={canvasRef} className="hidden" />
                {/* 检测框叠加层 */}
                <canvas ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ display: isStreaming ? "block" : "none" }}
                />

                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {hasPermission === false ? (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-destructive/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </div>
                          <p className="text-foreground font-medium mb-2">摄像头访问被拒绝</p>
                          <p className="text-sm text-muted-foreground">请启用摄像头权限</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-foreground font-medium mb-2">摄像头已就绪</p>
                          <p className="text-sm text-muted-foreground">点击开始按钮启动检测</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                {!isStreaming ? (
                  <button onClick={startCamera} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105 neon-border">
                    启动摄像头
                  </button>
                ) : (
                  <button onClick={stopCamera} className="px-8 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-all duration-300">
                    停止摄像头
                  </button>
                )}
              </div>
            </div>

            {/* Detection Panel */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">实时检测</h2>

              {detections.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isStreaming ? "正在扫描病害..." : "启动摄像头开始检测"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detections.map((det, index) => (
                    <div key={index} className="p-4 rounded-xl bg-secondary/30 border border-primary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground text-sm">{det.label}</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
                          {(det.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${det.confidence * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 rounded-xl bg-secondary/20 border border-border">
                <h3 className="text-sm font-medium text-foreground mb-2">可检测病害</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>🟡 玉米灰斑病</li>
                  <li>🟢 健康</li>
                  <li>🟠 玉米叶斑病</li>
                  <li>🔴 玉米锈病</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
