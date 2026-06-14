'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, PlusCircle, Wallet, Settings, Zap, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ThemeToggle from '@/components/shared/ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/plans', label: 'My Plans', icon: ClipboardList },
  { href: '/dashboard/new-plan', label: 'New Plan', icon: PlusCircle },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-border/50 bg-linen/95 dark:bg-plum-black/95 backdrop-blur-sm z-40 hidden md:flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 group w-fit">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-7 h-7 rounded-lg bg-plum dark:bg-peach flex items-center justify-center"
          >
            <Zap className="w-4 h-4 text-linen dark:text-plum-black" fill="currentColor" />
          </motion.div>
          <span className="font-bold text-lg">
            Fit<span className="text-plum dark:text-peach">Fam</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-plum/10 dark:bg-peach/10 text-plum dark:text-peach border border-plum/20 dark:border-peach/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-plum/5 dark:hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'text-plum dark:text-peach' : ''}`} />
              {item.label}
              {item.href === '/dashboard/new-plan' && (
                <span className="ml-auto text-xs bg-mauve/15 dark:bg-peach/15 text-mauve dark:text-peach px-1.5 py-0.5 rounded-md font-medium">
                  New
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-border/40 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-xs text-muted-foreground flex-1">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-all w-full group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Log Out
        </button>
      </div>
    </aside>
  )
}
