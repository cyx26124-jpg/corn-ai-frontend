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
  disease: string
  confidence: number
  bbox: number[]   // [x1, y1, x2, y2]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function CameraDetectionPage() {
  const [isStreaming, setIsStreaming]       = useState(false)
  const [hasPermission, setHasPermission]  = useState<boolean | null>(null)
  const [detections, setDetections]        = useState<Detection[]>([])
  const [fps, setFps]                      = useState(0)
  const [status, setStatus]                = useState<"idle" | "detecting" | "error">("idle")
  const [errorMsg, setErrorMsg]            = useState("")
  const [lastDetectTime, setLastDetectTime] = useState("")

  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const captureRef  = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const animRef     = useRef<number>()
  const detectTimer = useRef<ReturnType<typeof setInterval>>()
  const fpsTimer    = useRef<ReturnType<typeof setInterval>>()
  const isDetecting = useRef(false)
  const detsRef     = useRef<Detection[]>([])
  const fpsCount    = useRef(0)

  const renderLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (video.readyState >= 2) {
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      detsRef.current.forEach((det) => {
        const { x, y, width, height } = det.bbox
        ctx.strokeStyle = "#4ade80"
        ctx.lineWidth = 3
        ctx.strokeRect(x, y, width, height)
        const text = `${det.label}  ${(det.confidence * 100).toFixed(1)}%`
        ctx.font = "bold 15px sans-serif"
        const tw = ctx.measureText(text).width
        ctx.fillStyle = "rgba(0,0,0,0.75)"
        ctx.fillRect(x, y - 28, tw + 14, 28)
        ctx.fillStyle = "#4ade80"
        ctx.fillText(text, x + 7, y - 8)
      })
    }
    fpsCount.current++
    animRef.current = requestAnimationFrame(renderLoop)
  }, [])

  const detectOnce = useCallback(async () => {
    if (isDetecting.current) return
    const video   = videoRef.current
    const capture = captureRef.current
    if (!video || !capture || video.readyState < 2) return

    isDetecting.current = true
    setStatus("detecting")

    try {
      capture.width  = video.videoWidth  || 640
      capture.height = video.videoHeight || 480
      const ctx = capture.getContext("2d")!
      ctx.drawImage(video, 0, 0, capture.width, capture.height)
      const base64 = capture.toDataURL("image/jpeg", 0.85).split(",")[1]

      const res = await fetch(`${API_BASE}/camera_frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ frame: base64, run_diagnosis: false }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const parsed: Detection[] = (data.detections as ApiDetection[] || []).map((d) => ({
        label: d.disease,
        confidence: d.confidence,
        bbox: { x: d.bbox[0], y: d.bbox[1], width: d.bbox[2] - d.bbox[0], height: d.bbox[3] - d.bbox[1] },
      }))

      detsRef.current = parsed
      setDetections(parsed)
      setStatus("idle")
      setLastDetectTime(new Date().toLocaleTimeString())
      setErrorMsg("")
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "检测失败")
    } finally {
      isDetecting.current = false
    }
  }, [])

  const startCamera = async () => {
    setErrorMsg("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
      })
      const video = videoRef.current!
      video.srcObject = stream
      streamRef.current = stream
      await video.play()
      setIsStreaming(true)
      setHasPermission(true)
    } catch (e) {
      setHasPermission(false)
      setErrorMsg("无法访问摄像头：" + (e instanceof Error ? e.message : String(e)))
    }
  }

  const stopCamera = useCallback(() => {
    if (animRef.current)     cancelAnimationFrame(animRef.current)
    if (detectTimer.current) clearInterval(detectTimer.current)
    if (fpsTimer.current)    clearInterval(fpsTimer.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    detsRef.current = []
    isDetecting.current = false
    setIsStreaming(false)
    setDetections([])
    setFps(0)
    setStatus("idle")
  }, [])

  useEffect(() => {
    if (!isStreaming) return
    animRef.current     = requestAnimationFrame(renderLoop)
    detectTimer.current = setInterval(detectOnce, 1500)
    fpsTimer.current    = setInterval(() => { setFps(fpsCount.current); fpsCount.current = 0 }, 1000)
    return () => {
      if (animRef.current)     cancelAnimationFrame(animRef.current)
      if (detectTimer.current) clearInterval(detectTimer.current)
      if (fpsTimer.current)    clearInterval(fpsTimer.current)
    }
  }, [isStreaming, renderLoop, detectOnce])

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />
      <canvas ref={captureRef} className="hidden" />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">摄像头</span>{" "}
              <span className="text-primary neon-text">检测</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">实时摄像头检测，每 1.5 秒分析一次</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">实时画面</h2>
                <div className="flex items-center gap-3">
                  {isStreaming && (
                    <>
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400">直播中</span>
                      </span>
                      <span className="text-sm text-muted-foreground font-mono">{fps} FPS</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        status === "detecting" ? "bg-yellow-500/20 text-yellow-400 animate-pulse"
                        : status === "error"   ? "bg-red-500/20 text-red-400"
                        : "bg-primary/20 text-primary"
                      }`}>
                        {status === "detecting" ? "检测中..." : status === "error" ? "⚠ 错误" : "就绪"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="relative aspect-video bg-secondary/30 rounded-xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted
                  className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: isStreaming ? "block" : "none" }} />

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
                          <p className="text-foreground font-medium mb-1">摄像头访问被拒绝</p>
                          <p className="text-sm text-muted-foreground">{errorMsg || "请在浏览器中开启权限"}</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-foreground font-medium mb-1">摄像头已就绪</p>
                          <p className="text-sm text-muted-foreground">点击下方按钮开始</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && isStreaming && (
                <div className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-all">⚠ {errorMsg}</div>
              )}

              <div className="flex justify-center mt-6">
                {!isStreaming ? (
                  <button onClick={startCamera} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105">启动摄像头</button>
                ) : (
                  <button onClick={stopCamera} className="px-8 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-all duration-300">停止摄像头</button>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex flex-col">
              <h2 className="text-xl font-semibold mb-4">实时检测结果</h2>

              {detections.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">{isStreaming ? "正在扫描病害..." : "启动摄像头开始检测"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detections.map((det, i) => (
                    <div key={i} className="p-4 rounded-xl bg-secondary/30 border border-primary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{det.label}</span>
                        <span className="px-2 py-1 rounded text-xs font-bold bg-primary/20 text-primary">
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${det.confidence * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {lastDetectTime && (
                <p className="mt-3 text-xs text-muted-foreground text-center">最近检测：{lastDetectTime}</p>
              )}

              <div className="mt-4 p-4 rounded-xl bg-secondary/20 border border-border">
                <h3 className="text-sm font-medium mb-2">可检测病害</h3>
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
