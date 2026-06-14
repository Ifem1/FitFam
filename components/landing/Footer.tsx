import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#00FF88] flex items-center justify-center">
                <Zap className="w-4 h-4 text-black" fill="black" />
              </div>
              <span className="font-bold text-lg">
                Fit<span className="text-[#00FF88]">Fam</span>
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
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Technology</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  GenLayer Docs
                </a>
              </li>
              <li>
                <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  GenLayer Studio
                </a>
              </li>
              <li>
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Supabase
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FitFam. Built on GenLayer StudioNet.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-pulse" />
            StudioNet Live
          </div>
        </div>
      </div>
    </footer>
  )
}
