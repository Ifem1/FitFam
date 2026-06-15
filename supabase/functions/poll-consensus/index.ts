// Poll Consensus Edge Function
// Checks GenLayer for finalized transactions and updates plan status in DB
// Contract: 0xBF5eC6C9e42e8e8956d8C1F4f24235CD9616Ca14
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getTransactionReceipt } from '../_shared/genlayer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: pendingPlans, error } = await supabase
      .from('plans')
      .select('id, contract_transaction_hash')
      .eq('status', 'pending')
      .not('contract_transaction_hash', 'is', null)

    if (error) throw error
    if (!pendingPlans || pendingPlans.length === 0) {
      return new Response(JSON.stringify({ processed: 0, pending: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let processed = 0

    for (const plan of pendingPlans) {
      try {
        const receipt = await getTransactionReceipt(plan.contract_transaction_hash)
        if (!receipt || typeof receipt !== 'object') continue

        const rx = receipt as Record<string, unknown>
        const numericStatus = typeof rx.status === 'number' ? rx.status : null
        const consensusData = rx.consensus_data as Record<string, unknown> | undefined

        // Determine success by checking consensus_data.leader_receipt for a "return" status
        // This is robust regardless of what numeric status code GenLayer uses
        let isSuccess = false
        let isFailure = false
        let contractPlanId: string | null = null

        if (consensusData) {
          const leaderReceipt = consensusData.leader_receipt as Array<Record<string, unknown>> | undefined
          if (leaderReceipt && leaderReceipt.length > 0) {
            const leader = leaderReceipt[0]
            const result = leader.result as Record<string, unknown> | undefined
            if (result) {
              const resultStatus = result.status as string | undefined
              if (resultStatus === 'return') {
                isSuccess = true
                const payload = result.payload as Record<string, unknown> | undefined
                const readable = payload?.readable as string | undefined
                if (readable) {
                  // readable is like "\"0\"" — strip the wrapping quotes
                  contractPlanId = readable.replace(/^"|"$/g, '')
                }
              } else if (resultStatus === 'error' || resultStatus === 'exception') {
                isFailure = true
              }
            }
          }

          // Also check votes — if majority rejected
          const votes = consensusData.votes as Record<string, string> | undefined
          if (votes) {
            const voteValues = Object.values(votes)
            const disagreeCount = voteValues.filter(v => v === 'disagree').length
            if (disagreeCount > voteValues.length / 2) {
              isFailure = true
              isSuccess = false
            }
          }
        }

        // Fallback: check numeric status for known terminal states
        if (!isSuccess && !isFailure && numericStatus !== null) {
          // Statuses 0-3 are in-progress (PENDING, PROPOSING, COMMITTING, REVEALING)
          // Status 6 is UNDETERMINED
          if (numericStatus === 6) isFailure = true
        }

        console.log(`poll-consensus: plan=${plan.id} numericStatus=${numericStatus} isSuccess=${isSuccess} isFailure=${isFailure} contractPlanId=${contractPlanId}`)

        if (isSuccess) {
          await supabase
            .from('plans')
            .update({
              status: 'locked',
              contract_plan_id: contractPlanId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'confirmed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        } else if (isFailure) {
          await supabase
            .from('plans')
            .update({
              status: 'failed',
              error_message: 'GenLayer consensus failed or was undetermined',
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        }
      } catch (perPlanErr) {
        console.error(`poll-consensus: plan=${plan.id} ERROR:`, perPlanErr)
      }
    }

    // Also try to fetch content for unlocked plans that don't have content yet
    let contentFetched = 0
    try {
      const { data: unlockedNoContent } = await supabase
        .from('plans')
        .select('id, contract_plan_id')
        .eq('status', 'unlocked')
        .is('plan_content', null)
        .not('contract_plan_id', 'is', null)
        .limit(3)

      if (unlockedNoContent && unlockedNoContent.length > 0) {
        const { callContractView } = await import('../_shared/genlayer.ts')
        for (const uPlan of unlockedNoContent) {
          try {
            const onChain = await callContractView('get_plan', [uPlan.contract_plan_id]) as Record<string, unknown>
            const raw = onChain?.plan_content
            if (raw) {
              let parsed: Record<string, unknown> = {}
              if (typeof raw === 'string') {
                try { parsed = JSON.parse(raw) } catch { parsed = { raw } }
              } else if (typeof raw === 'object') {
                parsed = raw as Record<string, unknown>
              }
              await supabase.from('plans').update({ plan_content: parsed }).eq('id', uPlan.id)
              contentFetched++
              console.log(`poll-consensus: fetched content for plan ${uPlan.id}`)
            }
          } catch {
            // State not propagated yet — will retry next poll
          }
        }
      }
    } catch (contentErr) {
      console.error('poll-consensus: content fetch error:', contentErr)
    }

    return new Response(
      JSON.stringify({ processed, pending: pendingPlans.length, contentFetched }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('poll-consensus top-level error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
