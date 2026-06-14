'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const messages = [
  'GenLayer validators are analyzing your fitness profile...',
  'AI is generating your personalized workout schedule...',
  'Validators are reaching consensus on your nutrition plan...',
  'Verifying weekly milestones and progression logic...',
  'Finalizing your recovery and motivation framework...',
  'Almost there — consensus is being confirmed on-chain...',
]

const VALIDATOR_COLORS = [
  'from-plum to-mauve',
  'from-mauve to-peach',
  'from-peach to-mauve',
  'from-mauve to-plum',
  'from-plum-border to-mauve',
]

export default function ConsensusLoader() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [activeValidators, setActiveValidators] = useState([false, false, false, false, false])

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, 3500)

    // Progressively light up validators
    let v = 0
    const vTimer = setInterval(() => {
      if (v < 5) {
        const idx = v
        setActiveValidators((prev) => {
          const next = [...prev]
          next[idx] = true
          return next
        })
        v++
      } else {
        // Reset cycle
        v = 0
        setActiveValidators([false, false, false, false, false])
      }
    }, 2000)

    return () => {
      clearInterval(msgTimer)
      clearInterval(vTimer)
    }
  }, [])

  return (
    <div className="glass rounded-2xl p-12 text-center border border-mauve/30 dark:border-peach/20 relative overflow-hidden">
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-plum/5 via-transparent to-mauve/5 dark:from-peach/5 dark:to-mauve/5 pointer-events-none" />

      {/* Animated rings — more dramatic */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        {/* Outer ping */}
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border-2 border-mauve/40"
        />
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-1 rounded-full border-2 border-dashed border-mauve/30"
        />
        {/* Mid ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border-2 border-plum/50 dark:border-peach/40"
          style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-7 rounded-full border-2 border-mauve"
          style={{ borderBottomColor: 'transparent', borderLeftColor: 'transparent' }}
        />
        {/* Core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-plum to-mauve dark:from-mauve dark:to-peach flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-5 h-5 rounded-full bg-linen dark:bg-plum-black"
            />
          </motion.div>
        </div>
      </div>

      {/* Validator nodes */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <motion.div
              animate={activeValidators[i]
                ? { scale: [1, 1.3, 1], opacity: 1 }
                : { scale: 1, opacity: 0.3 }
              }
              transition={{ duration: 0.4 }}
              className={`w-4 h-4 rounded-full bg-gradient-to-br ${VALIDATOR_COLORS[i]}`}
            />
            <span className={`text-xs font-mono transition-colors ${
              activeValidators[i] ? 'text-mauve dark:text-peach' : 'text-muted-foreground'
            }`}>
              V{i + 1}
            </span>
            {/* Connection line */}
            {i < 4 && (
              <div className="absolute mt-2 hidden" /> /* spacer */
            )}
          </div>
        ))}
      </div>

      {/* Connection lines between validators */}
      <div className="relative flex items-center justify-center gap-0 mb-2 -mt-10 mb-8">
        <div className="flex items-center gap-0 w-64">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: activeValidators[i] && activeValidators[i + 1] ? 1 : 0.15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-px bg-gradient-to-r from-mauve to-mauve/50 mx-4"
            />
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Validators Reaching Consensus</h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-muted-foreground text-sm mb-4"
        >
          {messages[msgIndex]}
        </motion.p>
      </AnimatePresence>

      <p className="text-xs text-muted-foreground mb-6">
        GenLayer's 5 validators are independently verifying your plan. This typically takes 30 seconds to 2 minutes.
      </p>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-full w-1/2 bg-gradient-to-r from-transparent via-mauve dark:via-peach to-transparent rounded-full"
        />
      </div>

      {/* Validator count */}
      <div className="mt-4 text-xs text-muted-foreground">
        <span className="text-mauve dark:text-peach font-semibold">
          {activeValidators.filter(Boolean).length}
        </span>
        /5 validators confirmed
      </div>
    </div>
  )
}
