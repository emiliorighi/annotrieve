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

  return (
    <Card
      className={`${padding} hover:shadow-lg transition-all duration-300 border-border/50 animate-in fade-in slide-in-from-bottom-4`}
      style={{
        animationDelay: delay,
        animationDuration: '600ms',
        animationFillMode: 'both'
      }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`${iconSize} ${iconWidth} ${color}`} />
        </div>
        <div className="flex-1">
          <div className={`text-${textSize} font-bold text-foreground tabular-nums`}>
            {animatedValue.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {label}
          </div>
        </div>
      </div>
    </Card>
  )
}
