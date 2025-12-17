import React from 'react'

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-[#d7caa4]/40 animate-pulse rounded" />
      ))}
    </div>
  )
}

export function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <div style={{ height }} className="bg-[#d7caa4]/30 animate-pulse rounded" />
}
