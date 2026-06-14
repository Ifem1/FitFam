'use client'

import { useEffect, useState } from 'react'

const messages = [
  'GenLayer validators are analyzing your fitness profile...',
  'AI is generating your personalized workout schedule...',
  'Validators are reaching consensus on your nutrition plan...',
  'Verifying weekly milestones and progression logic...',
  'Finalizing your recovery and motivation framework...',
  'Almost there — consensus is being confirmed on-chain...',
]

export default function ConsensusLoader() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, 3500)
    const dotTimer = setInterval(() => {
      setDots((d) => (d + 1) % 4)
    }, 500)
    return () => {
      clearInterval(msgTimer)
      clearInterval(dotTimer)
    }
  }, [])

  return (
    <div className="glass rounded-2xl p-12 text-center border border-[#00FF88]/20">
      {/* Animated rings */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-[#00FF88]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-[#00FF88]/40 animate-spin-slow" />
        <div className="absolute inset-4 rounded-full border-2 border-[#00FF88]/60 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#00FF88]/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-[#00FF88] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Validator nodes visual */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-[#00FF88] animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
            <div className="text-xs text-muted-foreground font-mono">V{i + 1}</div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-3">Validators Reaching Consensus</h2>
      <p className="text-muted-foreground text-sm mb-4 h-5 transition-all">
        {messages[msgIndex]}{'.'.repeat(dots)}
      </p>
      <p className="text-xs text-muted-foreground">
        GenLayer's 5 validators are independently verifying your plan. This typically takes 30 seconds to 2 minutes.
      </p>

      {/* Progress shimmer */}
      <div className="mt-6 h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div className="h-full shimmer-bg rounded-full" />
      </div>
    </div>
  )
}
