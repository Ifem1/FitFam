'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Lock, ArrowLeft, Dumbbell, Apple, Target, Moon, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import ConsensusLoader from './ConsensusLoader'
import PlanRenderer from './PlanRenderer'
import Link from 'next/link'
import { usePlanStatus } from '@/hooks/usePlanStatus'

interface Plan {
  id: string
  status: string
  duration_months: number
  price_gen: number
  paid_at: string
  created_at: string
  plan_content: Record<string, unknown> | null
  error_message: string | null
  contract_plan_id: string | null
}

interface Props {
  plan: Plan
}

export default function PlanDetailClient({ plan }: Props) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)

  const { status, refresh } = usePlanStatus(plan.id)
  const currentStatus = status ?? plan.status

  useEffect(() => {
    if (status && status !== plan.status && status !== 'pending') {
      router.refresh()
    }
  }, [status, plan.status, router])

  const handlePayAndUnlock = async () => {
    setPaying(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const res = await fetch(`${supabaseUrl}/functions/v1/pay-for-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_id: plan.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? err.message ?? 'Payment failed')
      }
      toast.success('Plan unlocked! Loading your fitness program...')
      refresh()
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/dashboard/plans"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Plans
      </Link>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 border border-border/50"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{plan.duration_months}-Month Fitness Plan</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Created {new Date(plan.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
          <StatusBadge status={currentStatus} />
        </div>
      </motion.div>

      {/* Pending — consensus animation */}
      {currentStatus === 'pending' && <ConsensusLoader />}

      {/* Locked — payment CTA */}
      {(currentStatus === 'locked' || currentStatus === 'consensus_reached') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-10 text-center border border-mauve/30"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-plum/20 to-mauve/20 dark:from-peach/15 dark:to-mauve/15 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-9 h-9 text-plum dark:text-peach" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Your Plan Is Ready</h2>
          <p className="text-muted-foreground mb-2">
            GenLayer validators have reached consensus on your personalized plan.
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            Pay{' '}
            <span className="text-plum dark:text-peach font-semibold">{plan.price_gen} GEN tokens</span>{' '}
            to unlock your full workout and nutrition program.
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePayAndUnlock}
            disabled={paying}
            className="inline-flex items-center gap-2 btn-primary px-8 py-4 glow disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...</>
            ) : (
              <><Zap className="w-5 h-5" fill="currentColor" /> Pay {plan.price_gen} GEN & Unlock Plan</>
            )}
          </motion.button>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Dumbbell, label: 'Weekly Workouts' },
              { icon: Apple, label: 'Nutrition Guide' },
              { icon: Target, label: 'Milestones' },
              { icon: Moon, label: 'Recovery Tips' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-xl p-3 text-center border border-border/40 hover:border-mauve/30 transition-colors"
              >
                <item.icon className="w-5 h-5 text-mauve dark:text-peach mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Unlocked — render the plan */}
      {currentStatus === 'unlocked' && plan.plan_content && (
        <PlanRenderer
          content={plan.plan_content}
          durationMonths={plan.duration_months}
        />
      )}

      {/* Failed */}
      {currentStatus === 'failed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-10 text-center border border-destructive/20"
        >
          <p className="text-destructive font-semibold mb-2">Plan Generation Failed</p>
          <p className="text-muted-foreground text-sm">
            {plan.error_message ?? 'Something went wrong during plan generation. Please try again.'}
          </p>
          <Link
            href="/dashboard/new-plan"
            className="mt-6 inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm"
          >
            Try Again
          </Link>
        </motion.div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending:           { label: 'Consensus Pending', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
    consensus_reached: { label: 'Ready to Pay',      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
    locked:            { label: 'Ready to Unlock',   color: 'text-mauve dark:text-peach bg-mauve/10 dark:bg-peach/10 border-mauve/20 dark:border-peach/20' },
    unlocked:          { label: 'Active',             color: 'text-plum dark:text-peach bg-plum/10 dark:bg-peach/10 border-plum/20 dark:border-peach/20' },
    failed:            { label: 'Failed',             color: 'text-destructive bg-destructive/10 border-destructive/20' },
  }
  const c = config[status] ?? { label: status, color: 'text-muted-foreground bg-muted border-border' }
  return (
    <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${c.color}`}>
      {c.label}
    </span>
  )
}
