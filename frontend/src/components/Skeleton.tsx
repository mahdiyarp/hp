import React from 'react'

interface SkeletonProps {
  lines?: number
  height?: string
}

const Skeleton: React.FC<SkeletonProps> = ({ lines = 3, height = '20px' }) => {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="bg-[var(--border)] rounded" style={{ height }} />
      ))}
    </div>
  )
}

export default Skeleton
