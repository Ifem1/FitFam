'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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

      // Trigger wallet generation via Edge Function
      if (data.session) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ email: form.email }),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Failed to set up wallet')
        }
        router.push('/dashboard')
      } else {
        // Email confirmation required
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
      <div className="glass rounded-2xl p-8 w-full max-w-md text-center">
        <CheckCircle className="w-12 h-12 text-[#00FF88] mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to <strong>{form.email}</strong>.
          Click it to activate your account and get your wallet.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-[#00FF88] hover:underline"
        >
          Back to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-8 w-full max-w-md">
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/30 transition-all"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/30 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/30 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00FF88] text-black font-semibold py-3 rounded-lg hover:bg-[#00E87A] transition-all glow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account & wallet...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg">
        <p className="text-xs text-muted-foreground">
          🔐 A secure blockchain wallet is automatically created and linked to your account.
          Your private key is encrypted and stored safely — never exposed.
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-[#00FF88] hover:underline">
          Log In
        </Link>
      </p>
    </div>
  )
}
