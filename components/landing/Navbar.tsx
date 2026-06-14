'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Zap } from 'lucide-react'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF88] flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" fill="black" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            Fit<span className="text-[#00FF88]">Fam</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#testimonials" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Reviews
          </a>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-white transition-colors px-4 py-2"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-[#00FF88] text-black px-4 py-2 rounded-lg hover:bg-[#00E87A] transition-colors glow-sm"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-muted-foreground hover:text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-white/10">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <a href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>
              Pricing
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>
              Reviews
            </a>
            <hr className="border-white/10" />
            <Link href="/login" className="text-sm text-muted-foreground">
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-[#00FF88] text-black px-4 py-2 rounded-lg text-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
