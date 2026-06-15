'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type PlanStatus = 'pending' | 'consensus_reached' | 'locked' | 'unlocked' | 'failed'

interface PlanStatusResult {
  status: PlanStatus | null
  contractPlanId: string | null
  loading: boolean
  refresh: () => void
}

// Polls plan status every 15s while pending, and subscribes to Supabase Realtime for instant updates
export function usePlanStatus(planId: string | null): PlanStatusResult {
  const supabase = createClient()
  const [status, setStatus] = useState<PlanStatus | null>(null)
  const [contractPlanId, setContractPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!planId) return

    // Trigger the poll-consensus Edge Function so it checks GenLayer and updates the DB
    await supabase.functions.invoke('poll-consensus').catch(() => {})

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
  }, [planId, supabase])

  useEffect(() => {
    if (!planId) return

    fetchStatus()

    // Realtime subscription — instant update when poll-consensus flips the status
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

    // Fallback polling every 15s for environments where Realtime is blocked
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
