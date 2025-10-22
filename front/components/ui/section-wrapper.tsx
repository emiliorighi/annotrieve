"use client"

import { useEffect, useRef, useState, ReactNode } from "react"

interface SectionWrapperProps {
  children: ReactNode
  className?: string
  backgroundVariant?: "default" | "muted" | "accent"
  id?: string
}

export function SectionWrapper({ 
  children, 
  className = "", 
  backgroundVariant = "default",
  id 
}: SectionWrapperProps) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px"
      }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const backgroundClasses = {
    default: "",
    muted: "bg-muted/30",
    accent: "bg-accent/5"
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative ${backgroundClasses[backgroundVariant]} ${className}`}
    >
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {isVisible ? children : (
        <div className="container mx-auto px-4 py-12">
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      )}
      
      {/* Decorative bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  )
}

