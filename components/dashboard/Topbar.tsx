'use client'

import type { User } from '@supabase/supabase-js'
import { Bell } from 'lucide-react'

interface TopbarProps {
  user: User
}

export default function Topbar({ user }: TopbarProps) {
  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'FF'

  return (
    <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
      <div>
        <p className="text-xs text-muted-foreground">Welcome back,</p>
        <p className="text-sm font-medium">{user.email}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-white transition-colors relative">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#00FF88]/20 flex items-center justify-center text-sm font-bold text-[#00FF88]">
          {initials}
        </div>
      </div>
    </header>
  )
}
