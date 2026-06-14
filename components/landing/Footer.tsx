import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 bg-linen/50 dark:bg-plum-black/50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-7 h-7 rounded-lg bg-plum dark:bg-peach flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4 text-linen dark:text-plum-black" fill="currentColor" />
              </div>
              <span className="font-bold text-lg">
                Fit<span className="text-plum dark:text-peach">Fam</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              AI-generated, blockchain-verified fitness and nutrition plans. Built on GenLayer Intelligent Contracts.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><Link href="/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Log In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Technology</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  GenLayer Docs
                </a>
              </li>
              <li>
                <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  GenLayer Studio
                </a>
              </li>
              <li>
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Supabase
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FitFam. Built on GenLayer StudioNet.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mauve opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mauve dark:bg-peach" />
            </span>
            StudioNet Live
          </div>
        </div>
      </div>
    </footer>
  )
}
