'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from '@/components/shared/ThemeToggle'

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
        scrolled ? 'glass border-b border-border/50 shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-8 h-8 rounded-lg bg-plum dark:bg-peach flex items-center justify-center"
          >
            <Zap className="w-5 h-5 text-linen dark:text-plum-black" fill="currentColor" />
          </motion.div>
          <span className="font-bold text-xl tracking-tight">
            Fit<span className="text-plum dark:text-peach">Fam</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {['How It Works', 'Pricing', 'Reviews'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
            >
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-mauve group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
          ))}
        </div>

        {/* CTA + Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Log In
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-plum dark:bg-peach text-linen dark:text-plum-black px-5 py-2.5 rounded-xl hover:bg-plum-light dark:hover:bg-peach-dark transition-all glow-sm"
            >
              Get Started
            </Link>
          </motion.div>
        </div>

        {/* Mobile buttons */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="text-muted-foreground hover:text-foreground p-1"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/50 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {['How It Works', 'Pricing', 'Reviews'].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              ))}
              <hr className="border-border/40" />
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-plum dark:bg-peach text-linen dark:text-plum-black px-4 py-3 rounded-xl text-center"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
