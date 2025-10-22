"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (end === 0) return

    let startTime: number | null = null
    const startValue = 0

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t)
      const currentCount = Math.floor(startValue + (end - startValue) * easeOutQuad(progress))
      
      setCount(currentCount)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(animate)
  }, [end, duration])

  return count
}

interface StatsCardProps {
  value: number
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  delay: string
  padding: 'p-0' | 'p-1' | 'p-2' | 'p-3' | 'p-4' | 'p-5' | 'p-6' | 'p-7' | 'p-8' | 'p-9' | 'p-10'
  textSize: 'text-xs' | 'text-sm' | 'text-md' | 'text-lg' | 'text-xl' | 'text-2xl' | 'text-3xl' | 'text-4xl' | 'text-5xl' | 'text-6xl' | 'text-7xl' | 'text-8xl' | 'text-9xl' | 'text-10xl',
  iconSize: 'h-3' | 'h-4' | 'h-5' | 'h-6' | 'h-7' | 'h-8' | 'h-9' | 'h-10',
  iconWidth: 'w-3' | 'w-4' | 'w-5' | 'w-6' | 'w-7' | 'w-8' | 'w-9' | 'w-10'
}

export function StatsCard({ value, label, icon: Icon, color, bgColor, delay, padding, textSize, iconSize, iconWidth }: StatsCardProps) {
  const animatedValue = useAnimatedCounter(value)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className={`${padding} group relative overflow-hidden transition-all duration-300 border-border/50 hover:border-border hover:shadow-xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 cursor-default`}
      style={{
        animationDelay: delay,
        animationDuration: '600ms',
        animationFillMode: 'both'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex flex-col gap-4">
        {/* Icon row */}
        <div className="flex justify-start">
          <div className={`p-3 rounded-xl flex items-center justify-center ${bgColor} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
            <Icon className={`${iconSize} ${iconWidth} ${color} transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
          </div>
        </div>
        
        {/* Content row */}
        <div className="flex-1 min-w-0">
          <div className={`${textSize} font-bold text-foreground tabular-nums tracking-tight mb-1 transition-colors duration-300`}>
            {animatedValue.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground font-medium transition-colors duration-300 group-hover:text-foreground/80">
            {label}
          </div>
        </div>

        {/* Decorative element on the right edge */}
        <div className={`absolute right-0 top-0 bottom-0 w-1 ${bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      </div>

      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
    </Card>
  )
}
