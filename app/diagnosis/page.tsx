"use client"

import { useState } from "react"
import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"

interface Disease {
  id: string
  name: string
  scientificName: string
  severity: "低" | "中" | "高"
  symptoms: string[]
  causes: string[]
  treatment: string[]
  prevention: string[]
  affectedParts: string[]
  optimalConditions: string
}

const diseases: Disease[] = [
  {
    id: "gls",
    name: "玉米灰斑病",
    scientificName: "Cercospora zeae-maydis",
    severity: "高",
    symptoms: [
      "由叶脉限制的矩形灰色至棕褐色病斑",
      "病斑长2-7厘米，宽2-4毫米",
      "病斑首先出现在下部叶片，逐渐向上蔓延",
      "严重时叶片大面积枯死，影响光合作用",
    ],
    causes: [
      "由真菌病原体Cercospora zeae-maydis引起",
      "在玉米残茬中越冬，次年产生孢子",
      "雨水飞溅及气流传播孢子至健康叶片",
    ],
    treatment: [
      "在VT-R1生育期及时施用杀菌剂",
      "优先选用甲氧基丙烯酸酯+三唑类复配产品",
      "发病初期立即喷药，每7-10天一次，连续2-3次",
    ],
    prevention: [
      "种植耐病或抗病品种",
      "实行玉米与大豆、小麦等作物轮作",
      "收获后深翻土地，减少地表残茬",
      "改善田间通风，降低湿度",
    ],
    affectedParts: ["叶片", "叶鞘"],
    optimalConditions: "温暖温度25-30°C，高湿度且露水期延长",
  },
  {
    id: "healthy",
    name: "健康",
    scientificName: "Zea mays (正常)",
    severity: "低",
    symptoms: [
      "叶片颜色浓绿均匀，无斑点或变色",
      "叶片挺立，边缘整齐无缺损",
      "茎秆粗壮，节间均匀",
      "植株生长势旺，无异常枯萎",
    ],
    causes: [
      "植株生长环境良好，水肥充足",
      "未受病原菌、害虫侵染",
      "品种抗性强，田间管理到位",
    ],
    treatment: [
      "无需特殊治疗，维持正常田间管理",
      "按计划施肥浇水，保证营养均衡",
      "定期巡田，及早发现病害苗头",
    ],
    prevention: [
      "合理密植，保证通风透光",
      "科学施用氮磷钾肥，避免偏施氮肥",
      "定期监测病虫害，做到早发现早防治",
      "选用通过审定的抗病优良品种",
    ],
    affectedParts: ["全株"],
    optimalConditions: "气温20-30°C，土壤湿度适中，光照充足",
  },
  {
    id: "leaf_spot",
    name: "玉米叶斑病",
    scientificName: "Bipolaris maydis",
    severity: "中",
    symptoms: [
      "叶片出现平行边缘的棕褐色椭圆形病斑",
      "病斑长0.5-2.5厘米，周围有深色边缘",
      "病斑可能带有同心圆纹，外圈颜色较浅",
      "严重时多个病斑融合，导致叶片局部枯死",
    ],
    causes: [
      "由真菌病原体Bipolaris maydis引起",
      "在玉米残茬和土壤中越冬存活",
      "孢子通过风雨传播，高温高湿利于发病",
    ],
    treatment: [
      "病害初发时立即喷施叶面杀菌剂",
      "选用苯醚甲环唑、嘧菌酯等有效成分",
      "根据病害压力大小确定施药次数和间隔",
    ],
    prevention: [
      "优先选用抗性品种",
      "与大豆或小麦进行轮作种植",
      "收获后翻耕掩埋残茬，减少初侵染源",
      "避免在高湿天气进行灌溉",
    ],
    affectedParts: ["叶片", "叶鞘", "茎秆"],
    optimalConditions: "温暖潮湿天气20-32°C，频繁降雨或高湿度",
  },
  {
    id: "rust",
    name: "玉米锈病",
    scientificName: "Puccinia sorghi",
    severity: "中",
    symptoms: [
      "叶片两面出现小型圆形至椭圆形红褐色疱疹",
      "疱疹破裂后释放大量粉状红褐色孢子",
      "严重感染时叶片提前枯黄死亡",
      "茎秆和苞叶上也可见疱疹",
    ],
    causes: [
      "由真菌病原体Puccinia sorghi引起",
      "孢子随风从南方越冬区域长距离传播",
      "在寒冷气候地区不能越冬，每年依靠外来侵染",
    ],
    treatment: [
      "叶面积感染率超过1%时立即施用杀菌剂",
      "选用三唑类（戊唑醇）或甲氧基丙烯酸酯类农药",
      "抽雄前后为关键防治时期，重点保护上部叶片",
    ],
    prevention: [
      "种植携带抗锈基因的品种",
      "适当早播，避开锈病孢子传播高峰期",
      "加强田间巡查，一旦发现及时用药",
      "合理密植，改善田间通风条件",
    ],
    affectedParts: ["叶片", "茎秆", "苞叶"],
    optimalConditions: "凉爽温度15-25°C，高湿度，叶片长时间潮湿",
  },
]

export default function DiagnosisPage() {
  const [selectedDisease, setSelectedDisease] = useState<Disease>(diseases[0])
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDiseases = diseases.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "高":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "中":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "低":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
    }
  }

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">AI</span>{" "}
              <span className="text-primary neon-text">诊断</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              全面的病害信息，包含症状、病因和治疗建议
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Disease List */}
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-4">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索病害..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredDiseases.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => setSelectedDisease(disease)}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${
                      selectedDisease.id === disease.id
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-secondary/30 border border-transparent hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{disease.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(disease.severity)}`}>
                        {disease.severity}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground italic">{disease.scientificName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Disease Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">{selectedDisease.name}</h2>
                    <p className="text-muted-foreground italic">{selectedDisease.scientificName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getSeverityColor(selectedDisease.severity)}`}>
                    {selectedDisease.severity}危害程度
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDisease.affectedParts.map((part) => (
                    <span key={part} className="px-3 py-1 rounded-full bg-secondary/50 text-sm text-muted-foreground">
                      {part}
                    </span>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                  症状表现
                </h3>
                <ul className="space-y-2">
                  {selectedDisease.symptoms.map((symptom, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Treatment */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    治疗方法
                  </h3>
                  <ul className="space-y-2">
                    {selectedDisease.treatment.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Prevention */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    预防措施
                  </h3>
                  <ul className="space-y-2">
                    {selectedDisease.prevention.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Environmental Conditions */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </span>
                  适宜发病条件
                </h3>
                <p className="text-muted-foreground">{selectedDisease.optimalConditions}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
