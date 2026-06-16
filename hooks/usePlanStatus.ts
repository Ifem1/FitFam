'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type PlanStatus = 'awaiting_payment' | 'pending' | 'unlocked' | 'failed'

interface PlanStatusResult {
  status: PlanStatus | null
  contractPlanId: string | null
  loading: boolean
  refresh: () => void
}

export function usePlanStatus(planId: string | null): PlanStatusResult {
  const supabase = createClient()
  const [status, setStatus] = useState<PlanStatus | null>(null)
  const [contractPlanId, setContractPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!planId) return

    // Only trigger poll-consensus when the plan is in pending state
    if (status === 'pending' || status === null) {
      await supabase.functions.invoke('poll-consensus').catch(() => {})
    }

    const { data } = await supabase
      .from('plans')
      .select('status, contract_plan_id')
      .eq('id', planId)
      .single()

    if (data) {
      setStatus(data.status as PlanStatus)
      setContractPlanId(data.contract_plan_id)
    }
    setLoading(false)
  }, [planId, supabase, status])

  useEffect(() => {
    if (!planId) return

    fetchStatus()

    const channel = supabase
      .channel(`plan-status-${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plans',
          filter: `id=eq.${planId}`,
        },
        (payload) => {
          const updated = payload.new as { status: PlanStatus; contract_plan_id: string }
          setStatus(updated.status)
          setContractPlanId(updated.contract_plan_id)
        }
      )
      .subscribe()

    let pollInterval: ReturnType<typeof setInterval> | null = null
    if (status === 'pending' || status === null) {
      pollInterval = setInterval(fetchStatus, 15_000)
    }

    return () => {
      supabase.removeChannel(channel)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [planId, fetchStatus, status, supabase])

  return { status, contractPlanId, loading, refresh: fetchStatus }
}
