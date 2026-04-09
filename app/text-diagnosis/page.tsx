"use client"

import { useState, useRef, useEffect } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const QUICK_SYMPTOMS = [
  "叶片发黄", "出现斑点", "叶片枯死", "橙色粉末",
  "灰褐色条纹", "叶片卷曲", "茎秆变黑", "根部腐烂",
  "植株矮小", "叶缘焦枯", "白色霉层", "水渍状病斑",
]

interface DiagnosisResult {
  disease: string
  confidence: string
  description: string
  treatment: string
  prevention: string
  urgency: "立即处理" | "尽快处理" | "正常管理"
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
  interface SpeechRecognition extends EventTarget {
    lang: string; continuous: boolean; interimResults: boolean
    onresult: ((e: SpeechRecognitionEvent) => void) | null
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
    start(): void; stop(): void
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult; length: number
  }
  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative; isFinal: boolean
  }
  interface SpeechRecognitionAlternative { transcript: string; confidence: number }
  interface SpeechRecognitionErrorEvent extends Event { error: string }
}

export default function TextDiagnosisPage() {
  const [description, setDescription]       = useState("")
  const [selectedTags, setSelectedTags]     = useState<string[]>([])
  const [isLoading, setIsLoading]           = useState(false)
  const [result, setResult]                 = useState<DiagnosisResult | null>(null)
  const [error, setError]                   = useState("")
  const [isRecording, setIsRecording]       = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [interimText, setInterimText]       = useState("")
  const [voiceError, setVoiceError]         = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      setVoiceSupported(!!SR)
    }
  }, [])

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setVoiceError("请使用 Chrome 浏览器以启用语音功能"); return }
    setVoiceError("")
    const recognition = new SR()
    recognition.lang = "zh-CN"
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let final = ""; let interim = ""
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript
        else interim += event.results[i][0].transcript
      }
      if (final) { setDescription((p) => p + final); setInterimText("") }
      else setInterimText(interim)
    }
    recognition.onerror = (event) => {
      setVoiceError(
        event.error === "no-speech"    ? "未检测到声音，请靠近麦克风" :
        event.error === "not-allowed"  ? "麦克风权限被拒绝" :
        `语音识别出错：${event.error}`
      )
      setIsRecording(false); setInterimText("")
    }
    recognition.onend = () => { setIsRecording(false); setInterimText("") }
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); setInterimText("") }
  const toggleRecording = () => isRecording ? stopRecording() : startRecording()

  const toggleTag = (tag: string) =>
    setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])

  const handleSubmit = async () => {
    if (isRecording) stopRecording()
    const parts: string[] = []
    if (selectedTags.length > 0) parts.push(`症状标签：${selectedTags.join("、")}`)
    if (description.trim()) parts.push(`详细描述：${description.trim()}`)
    if (!parts.length) { setError("请至少选择症状或填写描述"); return }

    setIsLoading(true); setError(""); setResult(null)

    try {
      const prompt = `你是专业玉米病害诊断专家。农民描述如下症状：

${parts.join("\n")}

请判断最可能的病害，严格返回以下 JSON（不含任何多余文字或 markdown）：
{
  "disease": "病害名称（玉米灰斑病/玉米锈病/玉米叶斑病/健康）",
  "confidence": "高/中/低",
  "description": "病害说明（2-3句）",
  "treatment": "防治方法（每条换行）",
  "prevention": "预防措施（每条换行）",
  "urgency": "立即处理/尽快处理/正常管理"
}`

      const res = await fetch(`${API_BASE}/text_diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ description: prompt }),
      })
      if (!res.ok) throw new Error(`服务器错误 ${res.status}`)
      const data = await res.json()
      const text: string = data.diagnosis || data.result || ""
      try {
        const clean = text.replace(/```json|```/g, "").trim()
        setResult(JSON.parse(clean) as DiagnosisResult)
      } catch {
        setResult({ disease: "分析结果", confidence: "中", description: text, treatment: "", prevention: "", urgency: "尽快处理" })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "诊断失败，请检查网络或后端服务")
    } finally {
      setIsLoading(false)
    }
  }

  const getUrgencyStyle = (u: string) =>
    u === "立即处理" ? "bg-red-500/20 text-red-400 border-red-500/30"
    : u === "尽快处理" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : "bg-green-500/20 text-green-400 border-green-500/30"

  const reset = () => {
    if (isRecording) stopRecording()
    setDescription(""); setSelectedTags([]); setResult(null); setError(""); setVoiceError(""); setInterimText("")
  }

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />
      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">文字 / 语音</span>{" "}
              <span className="text-primary neon-text">诊断</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              没有图片？说出或描述症状，AI 立即帮你判断病害类型
            </p>
          </div>

          {!result ? (
            <div className="space-y-6">

              {/* 快速症状 */}
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">✓</span>
                  快速选择症状
                  <span className="text-sm text-muted-foreground font-normal">（可多选）</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SYMPTOMS.map((tag) => (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground scale-105"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}>
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <p className="mt-3 text-sm text-primary">已选：{selectedTags.join("、")}</p>
                )}
              </div>

              {/* 语音 + 文字输入 */}
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">🎙</span>
                  语音 / 文字描述
                </h2>

                {voiceSupported && (
                  <div className="flex items-center gap-4 mb-4">
                    <button onClick={toggleRecording}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        isRecording
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                          : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                      }`}>
                      {isRecording ? (
                        <><span className="w-3 h-3 rounded-full bg-white animate-ping" />停止录音</>
                      ) : (
                        <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                        </svg>开始语音输入</>
                      )}
                    </button>
                    {isRecording && (
                      <div className="flex items-center gap-1.5">
                        {[1,2,3,4,5].map((i) => (
                          <div key={i} className="w-1 bg-primary rounded-full animate-bounce"
                            style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
                        ))}
                        <span className="ml-2 text-sm text-primary">正在聆听...</span>
                      </div>
                    )}
                  </div>
                )}

                {!voiceSupported && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                    ⚠ 请使用 Chrome 浏览器以启用语音输入功能
                  </div>
                )}

                {voiceError && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">⚠ {voiceError}</div>
                )}

                <div className="relative">
                  <textarea
                    value={description + interimText}
                    onChange={(e) => { if (!isRecording) setDescription(e.target.value) }}
                    readOnly={isRecording}
                    placeholder={isRecording ? "请开始说话，识别结果将自动填入..." : "例如：叶片上出现橙黄色粉末，用手摸会掉，下部叶片比较严重，最近天气潮湿..."}
                    rows={5}
                    className={`w-full px-4 py-3 rounded-xl border text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors resize-none text-sm leading-relaxed ${
                      isRecording ? "bg-primary/5 border-primary/50 cursor-not-allowed" : "bg-secondary/50 border-border focus:border-primary"
                    }`}
                  />
                </div>

                {description && !isRecording && (
                  <div className="flex justify-end mt-2">
                    <button onClick={() => setDescription("")} className="text-xs text-muted-foreground hover:text-foreground">清空</button>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">💡 可描述病斑颜色、形状、位置、发病时间、天气等</p>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">⚠ {error}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading || (selectedTags.length === 0 && !description.trim())}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    AI 正在分析症状...
                  </span>
                ) : "🌽 开始智能诊断"}
              </button>
            </div>

          ) : (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-primary/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">AI 诊断结果</p>
                    <h2 className="text-3xl font-bold text-primary neon-text">{result.disease}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getUrgencyStyle(result.urgency)}`}>{result.urgency}</span>
                    <span className="text-sm text-muted-foreground">置信度：<span className="text-foreground font-medium">{result.confidence}</span></span>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">{result.description}</p>
              </div>

              {result.treatment && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>防治方法
                  </h3>
                  <ul className="space-y-2">
                    {result.treatment.split("\n").filter(Boolean).map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        {item.replace(/^\d+[.、]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.prevention && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>预防措施
                  </h3>
                  <ul className="space-y-2">
                    {result.prevention.split("\n").filter(Boolean).map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                        {item.replace(/^\d+[.、]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={reset} className="flex-1 py-3 rounded-xl bg-secondary/50 text-foreground font-semibold hover:bg-secondary transition-all duration-300">重新诊断</button>
                <button onClick={() => window.location.href = "/diagnosis"} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300">查看病害库</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
