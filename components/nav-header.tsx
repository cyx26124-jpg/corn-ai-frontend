"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/",               label: "首页",     icon: "🏠" },
  { href: "/detect",         label: "图像检测", icon: "🔍" },
  { href: "/camera",         label: "摄像头",   icon: "📷" },
  { href: "/video",          label: "视频检测", icon: "🎬" },
  { href: "/diagnosis",      label: "病害诊断", icon: "🩺" },
  { href: "/text-diagnosis", label: "文字诊断", icon: "🎙️" },
  { href: "/sensor",         label: "物联监测", icon: "📡" },
  { href: "/chat",           label: "AI助手",   icon: "🤖" },
]

export function NavHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center neon-border">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground">
              穗智<span className="text-primary neon-text">AI</span>
            </span>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  pathname === item.href
                    ? "bg-primary/20 text-primary neon-text"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 移动端汉堡 */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* 移动端下拉菜单 */}
        {menuOpen && (
          <div className="lg:hidden pb-4 grid grid-cols-2 gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === item.href
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}>
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
