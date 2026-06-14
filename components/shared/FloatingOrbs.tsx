'use client'

import { motion } from 'framer-motion'

export default function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Large plum orb — top left */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(80,45,85,0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Mauve orb — top right */}
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -top-20 -right-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(147,80,115,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Peach orb — bottom right */}
      <motion.div
        animate={{ x: [0, -30, 20, 0], y: [0, -30, -10, 0], scale: [1, 1.08, 1.04, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        className="absolute -bottom-40 -right-20 w-[450px] h-[450px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(246,219,192,0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Small accent orb — center-left */}
      <motion.div
        animate={{ x: [0, 50, 20, 0], y: [0, -20, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 9 }}
        className="absolute top-1/2 left-1/4 w-[280px] h-[280px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(107,58,94,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}
