'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Lock, ArrowLeft, Dumbbell, Apple, Target, Moon, Zap } from 'lucide-react'
import { toast } from 'sonner'
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

  // Live status — updates via Realtime or 15s polling
  const { status, refresh } = usePlanStatus(plan.id)
  const currentStatus = status ?? plan.status

  // Auto-refresh server data when status changes from pending → locked
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
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Plans
      </Link>

      {/* Header card */}
      <div className="glass rounded-2xl p-6">
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
      </div>

      {/* Pending — show consensus animation */}
      {currentStatus === 'pending' && <ConsensusLoader />}

      {/* Locked — show payment CTA */}
      {(currentStatus === 'locked' || currentStatus === 'consensus_reached') && (
        <div className="glass rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#00FF88]" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Your Plan Is Ready</h2>
          <p className="text-muted-foreground mb-2">
            GenLayer validators have reached consensus on your personalized plan.
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            Pay{' '}
            <span className="text-[#00FF88] font-semibold">{plan.price_gen} GEN tokens</span>{' '}
            to unlock your full workout and nutrition program.
          </p>

          <button
            onClick={handlePayAndUnlock}
            disabled={paying}
            className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-8 py-4 rounded-xl hover:bg-[#00E87A] transition-all glow disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...</>
            ) : (
              <><Zap className="w-5 h-5" /> Pay {plan.price_gen} GEN & Unlock Plan</>
            )}
          </button>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Dumbbell, label: 'Weekly Workouts' },
              { icon: Apple, label: 'Nutrition Guide' },
              { icon: Target, label: 'Milestones' },
              { icon: Moon, label: 'Recovery Tips' },
            ].map((item) => (
              <div key={item.label} className="glass rounded-lg p-3 text-center">
                <item.icon className="w-5 h-5 text-[#00FF88] mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
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
        <div className="glass rounded-2xl p-10 text-center border border-red-500/20">
          <p className="text-red-400 font-semibold mb-2">Plan Generation Failed</p>
          <p className="text-muted-foreground text-sm">
            {plan.error_message ?? 'Something went wrong during plan generation. Please try again.'}
          </p>
          <Link
            href="/dashboard/new-plan"
            className="mt-6 inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#00E87A] text-sm"
          >
            Try Again
          </Link>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending:           { label: 'Consensus Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    consensus_reached: { label: 'Ready to Pay',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    locked:            { label: 'Locked',             color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    unlocked:          { label: 'Active',             color: 'text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20' },
    failed:            { label: 'Failed',             color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  }
  const c = config[status] ?? { label: status, color: 'text-muted-foreground bg-white/5 border-white/10' }
  return (
    <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${c.color}`}>
      {c.label}
    </span>
  )
}
