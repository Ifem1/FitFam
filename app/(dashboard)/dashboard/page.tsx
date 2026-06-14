import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PlusCircle, ArrowRight, TrendingUp, Clock, CheckCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Fetch user profile and plans
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: userProfile } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('id', session!.user.id)
    .single()

  const activePlan = plans?.find((p) => p.status === 'unlocked')
  const pendingPlans = plans?.filter((p) => ['pending', 'consensus_reached', 'locked'].includes(p.status)) ?? []
  const totalPlans = plans?.length ?? 0

  const stats = [
    { label: 'Total Plans', value: totalPlans, icon: ClipboardIcon, color: 'text-[#00FF88]' },
    { label: 'Pending', value: pendingPlans.length, icon: Clock, color: 'text-yellow-400' },
    { label: 'Completed', value: plans?.filter(p => p.status === 'unlocked').length ?? 0, icon: CheckCircle, color: 'text-blue-400' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your fitness journey</p>
        </div>
        <Link
          href="/dashboard/new-plan"
          className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2.5 rounded-lg hover:bg-[#00E87A] transition-all glow-sm text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Plan
        </Link>
      </div>

      {/* Active plan banner */}
      {activePlan && (
        <div className="glass rounded-2xl p-6 border border-[#00FF88]/20 bg-[#00FF88]/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#00FF88]" />
                <span className="text-[#00FF88] text-sm font-medium">Active Plan</span>
              </div>
              <h3 className="font-bold text-lg">{activePlan.duration_months}-Month Fitness Plan</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Started {new Date(activePlan.paid_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/dashboard/plans/${activePlan.id}`}
              className="flex items-center gap-2 glass px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-all"
            >
              View Plan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-5">
            <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Wallet snippet */}
      {userProfile?.wallet_address && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Wallet Address</p>
              <p className="font-mono text-sm text-[#00FF88]">
                {userProfile.wallet_address.slice(0, 6)}...{userProfile.wallet_address.slice(-4)}
              </p>
            </div>
            <Link
              href="/dashboard/wallet"
              className="text-sm text-muted-foreground hover:text-white flex items-center gap-1"
            >
              View Wallet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Recent plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Plans</h2>
          <Link href="/dashboard/plans" className="text-sm text-muted-foreground hover:text-white flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {!plans || plans.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center mx-auto mb-4">
              <PlusCircle className="w-8 h-8 text-[#00FF88]" />
            </div>
            <h3 className="font-semibold mb-2">No plans yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Create your first AI-generated fitness plan and get started on your transformation journey.
            </p>
            <Link
              href="/dashboard/new-plan"
              className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#00E87A] transition-all text-sm"
            >
              Create Your First Plan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanRow key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function PlanRow({ plan }: { plan: Record<string, unknown> }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Validators Consensus...', color: 'text-yellow-400 bg-yellow-400/10' },
    consensus_reached: { label: 'Ready to Pay', color: 'text-blue-400 bg-blue-400/10' },
    locked: { label: 'Locked — Pay to Unlock', color: 'text-orange-400 bg-orange-400/10' },
    unlocked: { label: 'Active', color: 'text-[#00FF88] bg-[#00FF88]/10' },
    failed: { label: 'Failed', color: 'text-red-400 bg-red-400/10' },
  }

  const status = statusConfig[plan.status as string] ?? { label: plan.status as string, color: 'text-muted-foreground' }

  return (
    <Link
      href={`/dashboard/plans/${plan.id}`}
      className="flex items-center justify-between glass rounded-xl p-4 hover:bg-white/5 transition-all group"
    >
      <div>
        <div className="font-medium text-sm">{plan.duration_months as number}-Month Plan</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {new Date(plan.created_at as string).toLocaleDateString()}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
      </div>
    </Link>
  )
}
