"use client"

import { useState, useEffect, useRef } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const MAX_HISTORY = 20

interface SensorData {
  temperature:   number
  humidity:      number
  soil_moisture: number
  rainfall:      number
  timestamp:     string
}

// ── 仪表盘圆环组件 ──────────────────────────────────────
function GaugeRing({ value, max, label, unit, color, icon }: {
  value: number; max: number; label: string
  unit: string; color: string; icon: string
}) {
  const pct  = Math.min(Math.max(value < 0 ? 0 : value, 0) / max, 1)
  const r    = 54
  const circ = 2 * Math.PI * r
  const dash = pct * circ * 0.75

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[135deg]">
          {/* 背景弧 */}
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
          {/* 数值弧 */}
          <circle cx="60" cy="60" r={r} fill="none" stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash + circ * 0.25}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{icon}</span>
          <span className="text-xl font-bold text-white mt-1">
            {value < 0 ? "--" : value}
            <span className="text-xs text-white/50">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-sm text-white/60 mt-1">{label}</span>
    </div>
  )
}

// ── 折线图组件 ──────────────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const valid = data.filter(v => v >= 0)
  if (valid.length < 2) return (
    <div className="h-12 flex items-center justify-center text-white/30 text-xs">
      数据采集中...
    </div>
  )
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const w = 200, h = 48
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = v < 0 ? h / 2 : h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  }).join(" ")

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  )
}

// ── 主页面 ──────────────────────────────────────────────
export default function SensorDashboard() {
  const [sensorData, setSensorData]     = useState<SensorData | null>(null)
  const [riskLevel, setRiskLevel]       = useState<"低"|"中"|"高">("低")
  const [riskReason, setRiskReason]     = useState("等待传感器数据...")
  const [connected, setConnected]       = useState(false)
  const [lastUpdate, setLastUpdate]     = useState("")
  const [noData, setNoData]             = useState(false)

  const tempHistory  = useRef<number[]>([])
  const humHistory   = useRef<number[]>([])
  const soilHistory  = useRef<number[]>([])
  const rainHistory  = useRef<number[]>([])
  const [, forceUpdate] = useState(0)

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/sensor_latest`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      if (!res.ok) throw new Error()
      const json = await res.json()

      if (json.status === "no_data") {
        setNoData(true); setConnected(false); return
      }

      setNoData(false); setConnected(true)
      setSensorData(json.data)
      setRiskLevel(json.risk_level)
      setRiskReason(json.risk_reason)
      setLastUpdate(new Date().toLocaleTimeString())

      const push = (arr: React.MutableRefObject<number[]>, v: number) => {
        arr.current.push(v)
        if (arr.current.length > MAX_HISTORY) arr.current.shift()
      }
      push(tempHistory,  json.data.temperature)
      push(humHistory,   json.data.humidity)
      push(soilHistory,  json.data.soil_moisture)
      push(rainHistory,  json.data.rainfall ?? 0)
      forceUpdate(n => n + 1)
    } catch {
      setConnected(false)
    }
  }

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 3000)
    return () => clearInterval(t)
  }, [])

  const riskColor = riskLevel === "高" ? "#ef4444" : riskLevel === "中" ? "#f59e0b" : "#22c55e"
  const riskBg    = riskLevel === "高" ? "bg-red-500/10 border-red-500/30"
                  : riskLevel === "中" ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-green-500/10 border-green-500/30"

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-6xl mx-auto">

          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-foreground">物联网</span>{" "}
              <span className="text-primary neon-text">监测中心</span>
            </h1>
            <p className="text-muted-foreground">
              野火小智 STM32 · 温湿度 · 土壤湿度 · 雨量检测 · 病害风险评估
            </p>
          </div>

          {/* 连接状态 */}
          <div className="glass-card rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              <span className="text-sm font-medium">
                {connected ? "✅ STM32 已连接" : noData ? "📡 等待 STM32 上线..." : "🔄 连接中..."}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {lastUpdate && <span>最后更新：{lastUpdate}</span>}
              <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">每 3 秒刷新</span>
            </div>
          </div>

          {/* 无数据时显示接线说明 */}
          {noData && (
            <div className="glass-card rounded-2xl p-8 mb-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">📡</div>
                <p className="text-foreground font-semibold text-lg mb-1">等待 STM32 发送数据</p>
                <p className="text-sm text-muted-foreground">请按以下步骤完成硬件连接和程序运行</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* 接线图 */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">🔌 接线方式</h3>
                  <div className="text-xs font-mono text-muted-foreground space-y-2">
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-orange-400 font-semibold mb-1">温湿度模块</p>
                      <p>VCC → 3V3 &nbsp; GND → GND &nbsp; DATA → <span className="text-primary">PA4</span></p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-green-400 font-semibold mb-1">土壤湿度模块</p>
                      <p>VCC → 3V3 &nbsp; GND → GND &nbsp; AO → <span className="text-primary">PA0</span></p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 font-semibold mb-1">雨量检测模块</p>
                      <p>VCC → 3V3 &nbsp; GND → GND &nbsp; AO → <span className="text-primary">PA1</span></p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-purple-400 font-semibold mb-1">USB 数据线</p>
                      <p>STM32 USB-C → 电脑 USB 口</p>
                    </div>
                  </div>
                </div>

                {/* 启动步骤 */}
                <div className="bg-secondary/30 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">🚀 启动步骤</h3>
                  <div className="space-y-3 text-xs">
                    {[
                      { step: "1", title: "烧录固件", desc: "用 Keil MDK 打开工程，烧录 stm32_main.c 到板子" },
                      { step: "2", title: "安装依赖", desc: "pip install pyserial requests", code: true },
                      { step: "3", title: "启动后端", desc: "uvicorn app.main:app --host 0.0.0.0 --port 8000", code: true },
                      { step: "4", title: "运行转发脚本", desc: "python serial_bridge.py", code: true },
                    ].map(item => (
                      <div key={item.step} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold">{item.step}</span>
                        <div>
                          <p className="text-foreground font-medium">{item.title}</p>
                          <p className={`mt-0.5 ${item.code ? "font-mono text-primary bg-black/30 px-2 py-0.5 rounded" : "text-muted-foreground"}`}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 有数据时显示仪表盘 */}
          {sensorData && (
            <>
              {/* 病害风险卡片 */}
              <div className={`glass-card rounded-2xl p-5 mb-6 border ${riskBg}`}>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {riskLevel === "高" ? "🚨" : riskLevel === "中" ? "⚠️" : "✅"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-bold text-foreground">病害风险评估</span>
                      <span className="px-3 py-0.5 rounded-full text-sm font-bold border"
                        style={{ color: riskColor, borderColor: riskColor, background: `${riskColor}20` }}>
                        {riskLevel}风险
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{riskReason}</p>
                  </div>
                  {riskLevel === "高" && (
                    <button onClick={() => window.location.href = "/detect"}
                      className="shrink-0 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors">
                      立即检测 →
                    </button>
                  )}
                </div>
              </div>

              {/* 四个仪表盘 */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-6 text-center">实时传感器数据</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
                  <GaugeRing value={sensorData.temperature}   max={50}  label="空气温度" unit="°C" color="#f97316" icon="🌡️" />
                  <GaugeRing value={sensorData.humidity}      max={100} label="空气湿度" unit="%" color="#38bdf8"  icon="💧" />
                  <GaugeRing value={sensorData.soil_moisture} max={100} label="土壤湿度" unit="%" color="#4ade80"  icon="🌱" />
                  <GaugeRing value={sensorData.rainfall ?? 0} max={100} label="雨量强度" unit="%" color="#818cf8"  icon="🌧️" />
                </div>
              </div>

              {/* 历史折线图 */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {[
                  { label: "温度趋势",     unit: "°C", data: tempHistory.current,  color: "#f97316" },
                  { label: "湿度趋势",     unit: "%",  data: humHistory.current,   color: "#38bdf8" },
                  { label: "土壤湿度趋势", unit: "%",  data: soilHistory.current,  color: "#4ade80" },
                  { label: "雨量趋势",     unit: "%",  data: rainHistory.current,  color: "#818cf8" },
                ].map(item => (
                  <div key={item.label} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      {item.data.length > 0 && (
                        <span className="text-sm font-bold" style={{ color: item.color }}>
                          {item.data[item.data.length - 1] < 0 ? "--" : item.data[item.data.length - 1]}{item.unit}
                        </span>
                      )}
                    </div>
                    <MiniChart data={item.data} color={item.color} />
                  </div>
                ))}
              </div>

              {/* 智能种植建议 */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">🌽</span>
                  智能种植建议
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">🌡️ 温湿预警</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sensorData.temperature < 0 ? "⚠️ 温度传感器未就绪" :
                        sensorData.temperature > 30 && sensorData.humidity > 75
                        ? "⚠️ 高温高湿，真菌病害高发，建议检查叶片"
                        : sensorData.temperature < 15 ? "⚠️ 温度偏低，注意保温"
                        : "✅ 温湿适宜，有利生长"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">💧 灌溉建议</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sensorData.soil_moisture < 30 ? "⚠️ 土壤偏干，建议适量灌溉"
                        : sensorData.soil_moisture > 80 ? "⚠️ 土壤过湿，暂停灌溉防涝"
                        : "✅ 土壤湿度适宜，无需灌溉"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">🌧️ 雨量状态</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {(sensorData.rainfall ?? 0) > 70 ? "⚠️ 降雨量大，注意排涝防病"
                        : (sensorData.rainfall ?? 0) > 30 ? "🌦️ 有降雨，可减少灌溉"
                        : "☀️ 无明显降雨，正常管理"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">🔬 AI检测</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {riskLevel === "高"
                        ? "⚠️ 环境高危，建议立即上传叶片图像检测"
                        : "上传叶片照片进行 AI 病害识别"}
                    </p>
                    <button onClick={() => window.location.href = "/detect"}
                      className="w-full px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors">
                      去图像检测 →
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
