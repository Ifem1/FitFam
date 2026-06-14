'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) throw error

      if (data.session) {
        const { error: fnError } = await supabase.functions.invoke('auth-signup', {
          body: { email: form.email },
        })
        if (fnError) throw new Error(fnError.message || 'Failed to set up wallet')
        router.push('/dashboard')
      } else {
        setDone(true)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-8 w-full max-w-md text-center border border-border/50"
      >
        <div className="w-16 h-16 rounded-full bg-mauve/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-mauve dark:text-peach" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to <strong>{form.email}</strong>.
          Click it to activate your account and get your wallet.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-plum dark:text-peach hover:underline font-medium"
        >
          Back to Login
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl p-8 w-full max-w-md border border-border/50"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          A blockchain wallet is auto-generated for you — no setup needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
          <input
            type={showPass ? 'text' : 'password'}
            required
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="input-field"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 glow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account & wallet...
            </>
          ) : (
            'Create Account'
          )}
        </motion.button>
      </form>

      <div className="mt-6 p-4 rounded-xl border border-mauve/20 dark:border-peach/20 bg-mauve/5 dark:bg-peach/5 flex gap-3">
        <Lock className="w-4 h-4 text-mauve dark:text-peach mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          A secure blockchain wallet is automatically created and linked to your account.
          Your private key is encrypted and stored safely — never exposed.
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-plum dark:text-peach hover:underline font-medium">
          Log In
        </Link>
      </p>
    </motion.div>
  )
}
