"use client"

import { useState, useRef, useEffect } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const suggestedQuestions = [
  "如何识别北方叶枯病？",
  "玉米灌溉的最佳实践",
  "何时使用杀菌剂防治锈病？",
  "如何提高玉米产量？",
  "有机病虫害防治方法",
  "玉米播种前的土壤准备",
]

const aiResponses: Record<string, string> = {
  default: `我是您的AI农业助手，专注于玉米种植和病害管理。我可以帮助您：

- **病害识别**：识别常见玉米病害的症状
- **治疗建议**：病害管理的最佳实践
- **作物管理**：灌溉、施肥和种植指导
- **虫害防治**：综合虫害管理策略

今天有什么可以帮助您的？`,
  
  "北方叶枯病": `**北方叶枯病 (Exserohilum turcicum)**

这是玉米最严重的叶部病害之一。以下是识别方法：

**主要症状：**
- 长椭圆形灰绿色至棕褐色病斑
- 病斑通常长2.5-15厘米
- 呈雪茄状外观
- 病斑可能融合，导致整片叶片枯死

**管理策略：**
1. 种植抗性品种（Ht基因）
2. 如病害压力大，在VT-R1期施用杀菌剂
3. 实行轮作
4. 通过翻耕掩埋感染残茬

需要了解更多关于杀菌剂施用时机或抗性品种的信息吗？`,

  "灌溉": `**玉米灌溉最佳实践**

合理灌溉对获得最佳玉米产量至关重要。以下是全面指南：

**关键生育期：**
- **V12-VT（抽雄前）**：用水高峰期开始
- **VT-R2（授粉期）**：最关键时期 - 每天需水约7.6毫米
- **R3-R5（灌浆期）**：保持充足水分

**建议：**
1. 监测30厘米深处土壤水分
2. 使用蒸散量为基础的灌溉调度
3. 高峰期每周灌溉25-38毫米
4. 吐丝期避免水分胁迫

**水分胁迫信号：**
- 中午前叶片卷曲
- 叶片呈灰绿色
- 花丝抽出减少

需要针对您所在地区或土壤类型的具体指导吗？`,

  "杀菌剂": `**玉米杀菌剂使用指南**

施药时机和产品选择是有效防治的关键：

**施药时机：**
- 从V8生育期开始巡田
- 在VT（抽雄期）进行预防性施药
- 如病害压力大，可在R1-R2期施药

**推荐产品：**
- **甲氧基丙烯酸酯类** (QoI)：吡唑醚菌酯、嘧菌酯
- **三唑类** (DMI)：戊唑醇、丙硫菌唑
- **复配产品**：阿米妙收、肟菌·戊唑醇

**施药技巧：**
1. 使用合适喷嘴确保覆盖
2. 早晨或傍晚施药
3. 每公顷至少150-200升药液
4. 注意抗性管理

需要我解释具体病害的防治阈值吗？`,

  "产量": `**提高玉米产量**

通过综合管理实现最佳产量：

**关键因素：**
1. **品种选择**：匹配您的土壤和气候
2. **种植密度**：每公顷6-7.5万株
3. **肥力管理**：根据土壤测试合理施用氮磷钾
4. **杂草防除**：在V6期前保持田间清洁

**关键管理时期：**
- **播种期**：确保出苗均匀整齐
- **V6-V8**：追施氮肥
- **VT-R1**：保护授粉免受胁迫

**增产措施：**
- 分次施用氮肥
- 使用种肥
- 早期监测和管理病害
- 灌浆期确保充足灌溉

您想深入了解哪个方面？`,
}

function getAIResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase()
  
  if (lowerMessage.includes("北方") || lowerMessage.includes("叶枯") || lowerMessage.includes("识别")) {
    return aiResponses["北方叶枯病"]
  }
  if (lowerMessage.includes("灌溉") || lowerMessage.includes("浇水") || lowerMessage.includes("水分")) {
    return aiResponses["灌溉"]
  }
  if (lowerMessage.includes("杀菌剂") || lowerMessage.includes("喷药") || lowerMessage.includes("锈病") || lowerMessage.includes("农药")) {
    return aiResponses["杀菌剂"]
  }
  if (lowerMessage.includes("产量") || lowerMessage.includes("提高") || lowerMessage.includes("增产")) {
    return aiResponses["产量"]
  }
  
  return aiResponses.default
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: aiResponses.default,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(messageText),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1000 + Math.random() * 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />

      <main className="relative z-10 pt-24 pb-8 px-4 sm:px-6 lg:px-8 page-transition h-screen flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6 shrink-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-foreground">AI农业</span>{" "}
              <span className="text-primary neon-text">助手</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              咨询玉米病害、作物管理和农业最佳实践相关问题
            </p>
          </div>

          {/* Chat Container */}
          <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-foreground"
                    }`}
                  >
                    <div 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                    <div className={`text-xs mt-2 ${
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 2 && (
              <div className="px-4 py-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">推荐问题：</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(question)}
                      className="px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border/50">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="询问玉米病害、作物管理相关问题..."
                    rows={1}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none transition-colors"
                    style={{ minHeight: "48px", maxHeight: "120px" }}
                  />
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                AI回复仅供参考学习。具体建议请咨询当地农业专家。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
