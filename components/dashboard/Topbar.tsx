'use client'

import type { User } from '@supabase/supabase-js'
import { Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface TopbarProps {
  user: User
}

export default function Topbar({ user }: TopbarProps) {
  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'FF'

  return (
    <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 sticky top-0 z-30 bg-linen/95 dark:bg-plum-black/95 backdrop-blur-sm">
      <div>
        <p className="text-xs text-muted-foreground">Welcome back,</p>
        <p className="text-sm font-medium truncate max-w-[200px]">{user.email}</p>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
        >
          <Bell className="w-4 h-4" />
        </motion.button>
        <motion.div
          whileHover={{ scale: 1.08 }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-plum to-mauve dark:from-mauve dark:to-peach flex items-center justify-center text-sm font-bold text-linen cursor-pointer"
        >
          {initials}
        </motion.div>
      </div>
    </header>
  )
}
