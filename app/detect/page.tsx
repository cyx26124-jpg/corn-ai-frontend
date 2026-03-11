"use client"

import { useState, useRef, useCallback } from "react"
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

export default function ImageDetectionPage() {
  const [image, setImage] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentFileRef = useRef<File | null>(null)

  const drawDetections = (imageSrc: string, dets: Detection[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      dets.forEach((det) => {
        ctx.strokeStyle = "#4ade80"
        ctx.lineWidth = 3
        ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height)

        const labelText = `${det.label} ${(det.confidence * 100).toFixed(1)}%`
        ctx.font = "bold 14px Inter, sans-serif"
        const textWidth = ctx.measureText(labelText).width
        ctx.fillStyle = "rgba(74, 222, 128, 0.9)"
        ctx.fillRect(det.bbox.x, det.bbox.y - 24, textWidth + 12, 24)
        ctx.fillStyle = "#000"
        ctx.fillText(labelText, det.bbox.x + 6, det.bbox.y - 7)
      })
    }
    img.src = imageSrc
  }

  const processImage = useCallback(async (file: File) => {
    currentFileRef.current = file
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result as string
      setImage(result)
      setIsProcessing(true)
      setDetections([])
      setError(null)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_BASE}/detect`, {
          method: "POST",
          headers: { "ngrok-skip-browser-warning": "true" },
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`服务器错误: ${response.status}`)
        }

        const data = await response.json()

        // 后端返回 detections 数组
        const parsed: Detection[] = (data.detections || []).map((d: ApiDetection) => ({
          label: d.class_name_zh || d.class_name,
          confidence: d.confidence,
          bbox: {
            x: d.bbox[0],
            y: d.bbox[1],
            width: d.bbox[2],
            height: d.bbox[3],
          },
        }))

        setDetections(parsed)
        drawDetections(result, parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : "检测失败，请检查后端服务是否运行")
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      processImage(file)
    }
  }, [processImage])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  const resetDetection = () => {
    setImage(null)
    setDetections([])
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">图像</span>{" "}
              <span className="text-primary neon-text">检测</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              上传玉米叶片图像，AI将实时识别病害并可视化显示检测框
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Area */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">上传图像</h2>

              {!image ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
                    isDragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-foreground font-medium mb-2">拖拽或点击上传图像</p>
                  <p className="text-sm text-muted-foreground">支持 JPG、PNG、WEBP 格式</p>
                </div>
              ) : (
                <div className="relative">
                  <canvas ref={canvasRef} className="w-full rounded-xl" style={{ maxHeight: "400px", objectFit: "contain" }} />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-primary font-medium">YOLOv26 正在处理中...</p>
                      </div>
                    </div>
                  )}
                  <button onClick={resetDetection} className="absolute top-4 right-4 p-2 rounded-lg bg-background/80 hover:bg-background text-foreground transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Results Panel */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">检测结果</h2>

              {error && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  ⚠️ {error}
                </div>
              )}

              {detections.length === 0 && !error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">
                    {isProcessing ? "正在检测中..." : "请上传图像以查看检测结果"}
                  </p>
                </div>
              ) : detections.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground">发现 {detections.length} 个检测目标</span>
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">YOLOv26</span>
                  </div>

                  {detections.map((det, index) => (
                    <div key={index} className="p-4 rounded-xl bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{det.label}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          det.confidence > 0.9 ? "bg-primary/20 text-primary"
                          : det.confidence > 0.7 ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                        }`}>
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${det.confidence * 100}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground font-mono">
                        检测框: [{det.bbox.x}, {det.bbox.y}, {det.bbox.width}, {det.bbox.height}]
                      </div>
                    </div>
                  ))}

                  <button onClick={() => window.location.href = "/diagnosis"} className="w-full mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300">
                    查看详细诊断
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
