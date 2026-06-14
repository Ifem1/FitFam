import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PlusCircle, ArrowRight } from 'lucide-react'

export default async function PlansPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending:           { label: 'Validators Reaching Consensus...', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
    consensus_reached: { label: 'Ready to Pay',                     color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
    locked:            { label: 'Locked — Pay to Unlock',           color: 'text-mauve bg-mauve/10 border-mauve/20' },
    unlocked:          { label: 'Unlocked & Active',                 color: 'text-plum dark:text-peach bg-plum/10 dark:bg-peach/10 border-plum/20 dark:border-peach/20' },
    failed:            { label: 'Failed',                            color: 'text-destructive bg-destructive/10 border-destructive/20' },
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">All your AI-generated fitness plans</p>
        </div>
        <Link
          href="/dashboard/new-plan"
          className="flex items-center gap-2 btn-primary px-4 py-2.5 text-sm glow-sm"
        >
          <PlusCircle className="w-4 h-4" /> New Plan
        </Link>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center border border-border/40">
          <div className="w-16 h-16 rounded-2xl bg-plum/10 dark:bg-peach/10 flex items-center justify-center mx-auto mb-4">
            <PlusCircle className="w-8 h-8 text-plum dark:text-peach" />
          </div>
          <h3 className="font-semibold mb-2">No plans yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Submit your fitness profile to generate your first plan.</p>
          <Link
            href="/dashboard/new-plan"
            className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm"
          >
            Create First Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const status = statusConfig[plan.status] ?? { label: plan.status, color: 'text-muted-foreground bg-muted border-border' }
            return (
              <Link
                key={plan.id}
                href={`/dashboard/plans/${plan.id}`}
                className="flex items-center justify-between glass rounded-2xl p-6 border border-border/40 hover:border-mauve/30 transition-all group card-hover"
              >
                <div className="space-y-2">
                  <div className="font-semibold">{plan.duration_months}-Month Fitness Plan</div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {plan.price_gen} GEN
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
