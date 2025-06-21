"use client"

import { useEffect, useState } from "react"

interface ErrorAnimationProps {
  size?: number
  className?: string
}

export function ErrorAnimation({ size = 64, className = "" }: ErrorAnimationProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + 2
      })
    }, 20)

    return () => clearInterval(timer)
  }, [])

  const radius = size / 2 - 4
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Circle */}
      <svg width={size} height={size} className="transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(239 68 68)" // red-500
          strokeWidth="3"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-75 ease-out"
        />
      </svg>

      {/* X Mark */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" className="text-red-500">
          <path
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            d="M6 6l12 12M6 18L18 6"
            className="animate-pulse"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: progress < 80 ? 24 : 0,
              transition: "stroke-dashoffset 0.5s ease-out",
            }}
          />
        </svg>
      </div>
    </div>
  )
}
