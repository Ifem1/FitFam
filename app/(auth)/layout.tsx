import Link from 'next/link'
import { Zap } from 'lucide-react'
import FloatingOrbs from '@/components/shared/FloatingOrbs'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Aurora + orbs */}
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      <FloatingOrbs />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Top bar */}
      <div className="p-6 relative z-10">
        <Link href="/" className="flex items-center gap-2 w-fit group">
          <div className="w-7 h-7 rounded-lg bg-plum dark:bg-peach flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap className="w-4 h-4 text-linen dark:text-plum-black" fill="currentColor" />
          </div>
          <span className="font-bold text-lg">
            Fit<span className="text-plum dark:text-peach">Fam</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        {children}
      </div>
    </div>
  )
}
