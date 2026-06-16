'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, TrendingUp, Clock, CheckCircle, Coins } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Plan {
  id: string
  duration_months: number
  status: string
  price_gen: number
  created_at: string
  users: { email: string; wallet_address: string }
}

interface PricingRow {
  duration_months: number
  price_gen: number
}

interface Stats {
  total: number
  pending: number
  unlocked: number
  revenue_gen: number
}

export default function AdminClient({
  plans,
  pricing,
  stats,
}: {
  plans: Plan[]
  pricing: PricingRow[]
  stats: Stats
}) {
  const supabase = createClient()
  const [localPricing, setLocalPricing] = useState<Record<number, number>>(
    Object.fromEntries(pricing.map((p) => [p.duration_months, p.price_gen]))
  )
  const [saving, setSaving] = useState(false)

  const handleUpdatePricing = async () => {
    setSaving(true)
    try {
      for (const [duration, price] of Object.entries(localPricing)) {
        const { error } = await supabase.functions.invoke('admin-update-pricing', {
          body: { duration_months: parseInt(duration), price_gen: price },
        })
        if (error) throw new Error('Failed to update pricing')
      }
      toast.success('Pricing updated on-chain and in database')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const statusColor: Record<string, string> = {
    awaiting_payment:  'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    pending:           'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    unlocked:          'text-plum dark:text-peach bg-plum/10 dark:bg-peach/10',
    failed:            'text-destructive bg-destructive/10',
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform analytics and contract management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans',        value: stats.total,               icon: TrendingUp, color: 'text-plum dark:text-peach' },
          { label: 'Pending Consensus',  value: stats.pending,             icon: Clock,       color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Unlocked Plans',     value: stats.unlocked,            icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Revenue',      value: `${stats.revenue_gen} GEN`, icon: Coins,      color: 'text-mauve dark:text-peach' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-5 border border-border/40">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pricing management */}
      <div className="glass rounded-2xl p-6 border border-border/50">
        <h2 className="font-semibold mb-4">Update Pricing Tiers</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {[1, 3, 6].map((d) => (
            <div key={d}>
              <label className="text-sm font-medium mb-1.5 block">{d}-Month Plan (GEN)</label>
              <input
                type="number" min={1} step={0.5}
                value={localPricing[d] ?? ''}
                onChange={(e) => setLocalPricing({ ...localPricing, [d]: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleUpdatePricing}
          disabled={saving}
          className="flex items-center gap-2 btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Pricing
        </button>
      </div>

      {/* Plans table */}
      <div className="glass rounded-2xl overflow-hidden border border-border/50">
        <div className="p-5 border-b border-border/40">
          <h2 className="font-semibold">All Plans ({plans.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-xs">
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Duration</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-plum/5 dark:hover:bg-white/5 transition-all">
                  <td className="p-4">
                    <div className="font-medium">{plan.users?.email}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {plan.users?.wallet_address?.slice(0, 10)}...
                    </div>
                  </td>
                  <td className="p-4">{plan.duration_months}mo</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor[plan.status] ?? ''}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="p-4 text-plum dark:text-peach font-medium">{plan.price_gen} GEN</td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
