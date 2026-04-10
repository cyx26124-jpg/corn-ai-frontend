"use client"

import { useState, useEffect, useRef } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

const MAX_HISTORY = 20

interface SensorData {
  temperature:   number
  humidity:      number
  soil_moisture: number
  rainfall:      number
}

// ── 模拟真实传感器数据（带随机波动）───────────────────────
function generateSensorData(prev: SensorData | null): SensorData {
  const base = prev ?? { temperature: 26, humidity: 68, soil_moisture: 55, rainfall: 12 }
  const fluctuate = (v: number, min: number, max: number, delta: number) =>
    Math.min(max, Math.max(min, +(v + (Math.random() - 0.5) * delta).toFixed(1)))
  return {
    temperature:   fluctuate(base.temperature,   10, 45,  0.8),
    humidity:      fluctuate(base.humidity,        20, 99,  1.5),
    soil_moisture: fluctuate(base.soil_moisture,   5,  98,  1.2),
    rainfall:      fluctuate(base.rainfall,        0,  100, 2.0),
  }
}

// ── 根据环境评估病害风险 ────────────────────────────────────
function calcRisk(d: SensorData): { level: "低"|"中"|"高"; reason: string } {
  const risks: string[] = []
  if (d.humidity > 80)      risks.push(`空气湿度${d.humidity.toFixed(0)}%过高`)
  if (d.temperature > 28)   risks.push(`气温${d.temperature.toFixed(1)}°C偏高`)
  if (d.soil_moisture > 80) risks.push(`土壤湿度${d.soil_moisture.toFixed(0)}%过高`)
  if (d.rainfall > 60)      risks.push(`雨量${d.rainfall.toFixed(0)}%较大`)

  if (risks.length >= 2)
    return { level: "高", reason: `⚠️ ${risks.join("，")}，灰斑病/锈病高发风险！建议立即检查叶片。` }
  if (risks.length === 1)
    return { level: "中", reason: `⚠️ ${risks[0]}，注意观察植株状态，做好预防措施。` }
  return { level: "低", reason: "✅ 当前环境适宜，病害风险较低，保持正常田间管理。" }
}

// ── 仪表盘圆环 ──────────────────────────────────────────────
function GaugeRing({ value, max, label, unit, color, icon }: {
  value: number; max: number; label: string
  unit: string; color: string; icon: string
}) {
  const pct  = Math.min(Math.max(value, 0) / max, 1)
  const r    = 54
  const circ = 2 * Math.PI * r
  const dash = pct * circ * 0.75

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[135deg]">
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash + circ * 0.25}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{icon}</span>
          <span className="text-xl font-bold text-white mt-1">
            {typeof value === "number" ? value.toFixed(value % 1 === 0 ? 0 : 1) : "--"}
            <span className="text-xs text-white/50">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-sm text-white/60 mt-1">{label}</span>
    </div>
  )
}

// ── 折线图 ──────────────────────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return (
    <div className="h-14 flex items-center justify-center text-white/30 text-xs">数据采集中...</div>
  )
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 300, h = 56
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 8) - 4
    return `${x},${y}`
  }).join(" ")
  const last = data[data.length - 1]
  const lx = w
  const ly = h - ((last - min) / range) * (h - 8) - 4

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      {/* 渐变填充 */}
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#grad-${color.replace("#","")})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={lx} cy={ly} r="4" fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  )
}

// ── 数字跳动动画 ─────────────────────────────────────────────
function AnimatedValue({ value, unit, color }: { value: number; unit: string; color: string }) {
  return (
    <span style={{ color }} className="text-2xl font-bold tabular-nums transition-all duration-500">
      {value.toFixed(value % 1 === 0 ? 0 : 1)}<span className="text-sm opacity-60">{unit}</span>
    </span>
  )
}

// ── 主页面 ──────────────────────────────────────────────────
export default function SensorDashboard() {
  const [data, setData]           = useState<SensorData>(() => generateSensorData(null))
  const [risk, setRisk]           = useState(() => calcRisk(generateSensorData(null)))
  const [time, setTime]           = useState("")
  const [tick, setTick]           = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  const tempHistory  = useRef<number[]>([])
  const humHistory   = useRef<number[]>([])
  const soilHistory  = useRef<number[]>([])
  const rainHistory  = useRef<number[]>([])
  const dataRef      = useRef(data)
  dataRef.current    = data

  // 每3秒更新一次模拟数据
  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => {
      const next = generateSensorData(dataRef.current)
      setData(next)
      setRisk(calcRisk(next))
      setTime(new Date().toLocaleTimeString())
      setTick(n => n + 1)

      const push = (arr: React.MutableRefObject<number[]>, v: number) => {
        arr.current.push(v)
        if (arr.current.length > MAX_HISTORY) arr.current.shift()
      }
      push(tempHistory,  next.temperature)
      push(humHistory,   next.humidity)
      push(soilHistory,  next.soil_moisture)
      push(rainHistory,  next.rainfall)
    }, 3000)
    return () => clearInterval(timer)
  }, [isRunning])

  // 初始化历史数据（页面一打开就有图）
  useEffect(() => {
    let cur = generateSensorData(null)
    for (let i = 0; i < MAX_HISTORY; i++) {
      cur = generateSensorData(cur)
      tempHistory.current.push(cur.temperature)
      humHistory.current.push(cur.humidity)
      soilHistory.current.push(cur.soil_moisture)
      rainHistory.current.push(cur.rainfall)
    }
    setTime(new Date().toLocaleTimeString())
    setTick(1)
  }, [])

  const riskColor = risk.level === "高" ? "#ef4444" : risk.level === "中" ? "#f59e0b" : "#22c55e"
  const riskBg    = risk.level === "高" ? "bg-red-500/10 border-red-500/30"
                  : risk.level === "中" ? "bg-yellow-500/10 border-yellow-500/30"
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
              野火小智 STM32 · 温湿度传感器 · 土壤湿度 · 雨量检测 · AI 病害风险评估
            </p>
          </div>

          {/* 状态栏 */}
          <div className="glass-card rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
              <span className="text-sm font-medium">
                {isRunning ? "✅ STM32 传感器已连接" : "⏸ 已暂停"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
                DEMO 模式
              </span>
            </div>
            <div className="flex items-center gap-3">
              {time && <span className="text-xs text-muted-foreground">最后更新：{time}</span>}
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-secondary/50">每 3 秒刷新</span>
              <button
                onClick={() => setIsRunning(r => !r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${isRunning ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" : "bg-primary/20 text-primary hover:bg-primary/30"}`}>
                {isRunning ? "⏸ 暂停" : "▶ 继续"}
              </button>
            </div>
          </div>

          {/* 病害风险卡片 */}
          <div className={`glass-card rounded-2xl p-5 mb-6 border ${riskBg}`} style={{ transition: "all 1s ease" }}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-4xl" style={{ transition: "all 0.5s ease" }}>
                {risk.level === "高" ? "🚨" : risk.level === "中" ? "⚠️" : "✅"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-lg font-bold text-foreground">病害风险评估</span>
                  <span className="px-3 py-0.5 rounded-full text-sm font-bold border"
                    style={{ color: riskColor, borderColor: riskColor, background: `${riskColor}20`, transition: "all 1s ease" }}>
                    {risk.level}风险
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{risk.reason}</p>
              </div>
              {risk.level === "高" && (
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
              <GaugeRing value={data.temperature}   max={50}  label="空气温度" unit="°C" color="#f97316" icon="🌡️" />
              <GaugeRing value={data.humidity}      max={100} label="空气湿度" unit="%" color="#38bdf8"  icon="💧" />
              <GaugeRing value={data.soil_moisture} max={100} label="土壤湿度" unit="%" color="#4ade80"  icon="🌱" />
              <GaugeRing value={data.rainfall}      max={100} label="雨量强度" unit="%" color="#818cf8"  icon="🌧️" />
            </div>
          </div>

          {/* 数据卡片 + 折线图 */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {[
              { label: "温度趋势",     unit: "°C", data: tempHistory.current,  color: "#f97316", cur: data.temperature,   min: 10, max: 45 },
              { label: "湿度趋势",     unit: "%",  data: humHistory.current,   color: "#38bdf8", cur: data.humidity,      min: 20, max: 99 },
              { label: "土壤湿度趋势", unit: "%",  data: soilHistory.current,  color: "#4ade80", cur: data.soil_moisture, min: 5,  max: 98 },
              { label: "雨量趋势",     unit: "%",  data: rainHistory.current,  color: "#818cf8", cur: data.rainfall,      min: 0,  max: 100 },
            ].map(item => (
              <div key={item.label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <AnimatedValue value={item.cur} unit={item.unit} color={item.color} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>最低 {item.data.length > 0 ? Math.min(...item.data).toFixed(1) : "--"}{item.unit}</span>
                  <span>最高 {item.data.length > 0 ? Math.max(...item.data).toFixed(1) : "--"}{item.unit}</span>
                </div>
                <MiniChart key={tick} data={[...item.data]} color={item.color} />
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
                  {data.temperature > 30 && data.humidity > 75
                    ? "⚠️ 高温高湿，真菌病害高发，建议检查叶片"
                    : data.temperature < 15 ? "⚠️ 温度偏低，注意保温"
                    : "✅ 温湿适宜，有利于玉米生长"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">💧 灌溉建议</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {data.soil_moisture < 30 ? "⚠️ 土壤偏干，建议适量灌溉"
                    : data.soil_moisture > 80 ? "⚠️ 土壤过湿，暂停灌溉防涝"
                    : "✅ 土壤湿度适宜，无需额外灌溉"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">🌧️ 雨量状态</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {data.rainfall > 70 ? "⚠️ 降雨量大，注意排涝防病"
                    : data.rainfall > 30 ? "🌦️ 有降雨，可适当减少灌溉"
                    : "☀️ 无明显降雨，正常管理即可"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">🔬 AI 检测</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {risk.level === "高"
                    ? "⚠️ 环境高危，建议立即上传叶片图像检测"
                    : "结合图像AI检测，精准识别病害类型"}
                </p>
                <button onClick={() => window.location.href = "/detect"}
                  className="w-full px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors">
                  去图像检测 →
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
