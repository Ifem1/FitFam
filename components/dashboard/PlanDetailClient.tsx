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
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()
  const router = useRouter()
  const [paying, setPaying] = useState(false)

  const { status, refresh } = usePlanStatus(plan.id)
  const currentStatus = status ?? plan.status

  useEffect(() => {
    if (status && status !== plan.status && status !== 'pending' && status !== 'awaiting_payment') {
      router.refresh()
    }
  }, [status, plan.status, router])

  const [planContent, setPlanContent] = useState<Record<string, unknown> | null>(plan.plan_content)
  const [loadingContent, setLoadingContent] = useState(false)

  const fetchPlanContent = async () => {
    setLoadingContent(true)
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 5000))
        const { data, error } = await supabase.functions.invoke('get-plan-content', {
          body: { plan_id: plan.id },
        })
        if (error) continue
        if (data?.plan_content) {
          setPlanContent(data.plan_content)
          setLoadingContent(false)
          return
        }
      } catch {
        // retry
      }
    }
    setLoadingContent(false)
    toast.error('Plan content is still loading. Please refresh in a moment.')
  }

  useEffect(() => {
    if (currentStatus === 'unlocked' && !planContent) {
      fetchPlanContent()
    }
  }, [currentStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePayAndGenerate = async () => {
    setPaying(true)
    try {
      const { data, error: payError } = await supabase.functions.invoke('pay-for-plan', {
        body: { plan_id: plan.id },
      })
      if (payError) {
        const ctx = payError.context
        const body = ctx instanceof Response ? await ctx.json().catch(() => null) : null
        throw new Error(body?.error || 'Payment failed')
      }
      toast.success('Payment submitted! GenLayer is generating your plan...')
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

      {/* Awaiting Payment — payment CTA */}
      {currentStatus === 'awaiting_payment' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-10 text-center border border-mauve/30"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-plum/20 to-mauve/20 dark:from-peach/15 dark:to-mauve/15 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-9 h-9 text-plum dark:text-peach" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Ready to Generate Your Plan</h2>
          <p className="text-muted-foreground mb-2">
            Your fitness profile is saved. Pay to start plan generation.
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            Pay{' '}
            <span className="text-plum dark:text-peach font-semibold">{plan.price_gen} GEN tokens</span>{' '}
            and GenLayer validators will create your personalized workout and nutrition program.
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePayAndGenerate}
            disabled={paying}
            className="inline-flex items-center gap-2 btn-primary px-8 py-4 glow disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Submitting Payment...</>
            ) : (
              <><Zap className="w-5 h-5" fill="currentColor" /> Pay {plan.price_gen} GEN & Generate Plan</>
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

      {/* Pending — consensus animation */}
      {currentStatus === 'pending' && <ConsensusLoader />}

      {/* Unlocked — render the plan or show loading */}
      {currentStatus === 'unlocked' && planContent && (
        <PlanRenderer
          content={planContent}
          durationMonths={plan.duration_months}
        />
      )}
      {currentStatus === 'unlocked' && !planContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-10 text-center border border-mauve/30"
        >
          {loadingContent ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-plum dark:text-peach mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Loading Your Plan</h2>
              <p className="text-muted-foreground text-sm">
                Fetching your personalized fitness plan...
              </p>
            </>
          ) : (
            <>
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Plan Content Loading</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Your plan is unlocked but the content is still being processed.
                This can take a few moments.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchPlanContent}
                className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm"
              >
                <Loader2 className="w-4 h-4" /> Retry Loading
              </motion.button>
            </>
          )}
        </motion.div>
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
    awaiting_payment:  { label: 'Awaiting Payment', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
    pending:           { label: 'Generating Plan',  color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
    unlocked:          { label: 'Active',            color: 'text-plum dark:text-peach bg-plum/10 dark:bg-peach/10 border-plum/20 dark:border-peach/20' },
    failed:            { label: 'Failed',            color: 'text-destructive bg-destructive/10 border-destructive/20' },
  }
  const c = config[status] ?? { label: status, color: 'text-muted-foreground bg-muted border-border' }
  return (
    <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${c.color}`}>
      {c.label}
    </span>
  )
}
