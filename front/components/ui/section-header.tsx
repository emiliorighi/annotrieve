"use client"

import { LucideIcon } from "lucide-react"

interface SectionHeaderProps {
  title: string
  description: string
  icon?: LucideIcon
  iconColor?: string
  iconBgColor?: string
  align?: "left" | "center"
}

export function SectionHeader({ 
  title, 
  description, 
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  align = "center"
}: SectionHeaderProps) {
  const alignmentClasses = align === "center" ? "text-center items-center" : "text-left items-start"
  const descriptionAlign = align === "center" ? "mx-auto" : ""

  return (
    <div className={`mb-12 ${alignmentClasses} animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      {Icon && (
        <div className={`inline-flex items-center justify-center mb-4 p-3 rounded-xl ${iconBgColor} transition-transform hover:scale-110 duration-300`}>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
        {title}
      </h2>
      <p className={`text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed ${descriptionAlign}`}>
        {description}
      </p>
    </div>
  )
}

