import { ParticlesBackground } from "@/components/particles-background"
import { NavHeader } from "@/components/nav-header"
import { FeatureCard } from "@/components/feature-card"

const features = [
  {
    href: "/detect",
    title: "图像检测",
    description: "上传玉米叶片图像，通过AI智能识别病害并可视化显示检测框。",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/camera",
    title: "摄像头检测",
    description: "使用设备摄像头进行实时病害检测，支持实时检测框叠加显示。",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/video",
    title: "视频检测",
    description: "上传视频文件进行逐帧分析，获取全面的检测统计数据。",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    href: "/diagnosis",
    title: "AI诊断",
    description: "全面的病害信息库，包含症状、病因和治疗建议。",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/chat",
    title: "AI农业助手",
    description: "智能对话机器人，解答农业问题、作物管理和专家建议。",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
]

const stats = [
  { value: "99.2%", label: "检测准确率" },
  { value: "50ms", label: "推理速度" },
  { value: "15+", label: "病害类型" },
  { value: "24/7", label: "全天候服务" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <NavHeader />
      
      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 page-transition">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              YOLOv26 + 多模态农业智能
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-foreground">玉米</span>{" "}
              <span className="text-primary neon-text">AI</span>{" "}
              <span className="text-foreground">诊断系统</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              基于先进的YOLOv26架构和多模态农业智能技术，
              为您提供专业的玉米病害检测服务。
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <a
                href="/detect"
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105 neon-border"
              >
                开始检测
              </a>
              <a
                href="/chat"
                className="px-8 py-3 rounded-xl glass-card text-foreground font-semibold hover:bg-secondary/50 transition-all duration-300 hover:scale-105"
              >
                咨询AI助手
              </a>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-xl p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary neon-text mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              智慧农业工具
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              全方位AI驱动的玉米健康监测工具套件
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <FeatureCard key={feature.href} {...feature} />
            ))}
          </div>

          {/* Tech Stack Badge */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full glass-card">
              <span className="text-sm text-muted-foreground">技术支持</span>
              <span className="text-sm font-mono text-primary">YOLOv26</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-mono text-primary">多模态AI</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-mono text-primary">边缘计算</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
