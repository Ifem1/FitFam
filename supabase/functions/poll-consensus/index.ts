// Poll Consensus Edge Function — triggered by pg_cron every minute
// Checks GenLayer for finalized transactions and updates plan status in DB
// Contract: 0xdA6F589f1e27BdA5518fD27C7F64B8FdD2bC4Bc0
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

    // Fetch all plans still waiting for consensus
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
        const receipt = await getTransactionReceipt(plan.contract_transaction_hash) as Record<string, unknown> | null
        if (!receipt) continue

        // genlayer-js shape: { txExecutionResultName, consensusData: { leaderReceipt: { returnValue, ... } }, ... }
        const execResult = receipt.txExecutionResultName as string | undefined
        const consensusStatus = receipt.status as string | undefined
        const status = execResult ?? consensusStatus

        // Terminal statuses across SDK versions: FINISHED_WITH_RETURN, FINALIZED, ACCEPTED
        const isSuccess = status === 'FINISHED_WITH_RETURN' || status === 'FINALIZED' || status === 'ACCEPTED'
        const isFailure = status === 'FINISHED_WITH_ERROR' || status === 'FAILED' || status === 'REJECTED'

        if (isSuccess) {
          const consensusData = receipt.consensusData as Record<string, unknown> | undefined
          const leaderReceipt = consensusData?.leaderReceipt as Record<string, unknown> | undefined
          const returnValue = leaderReceipt?.returnValue ?? receipt.result
          const contractPlanId = returnValue !== undefined && returnValue !== null
            ? String(returnValue)
            : null

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
          const errMsg = (receipt.error as string) ?? (receipt.exception as string) ?? 'GenLayer consensus failed'

          await supabase
            .from('plans')
            .update({
              status: 'failed',
              error_message: errMsg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)

          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('transaction_hash', plan.contract_transaction_hash)

          processed++
        }
        // Any other status (PENDING, PROPOSING, etc.) — leave and check again next poll
      } catch {
        // Per-plan errors don't abort the loop
      }
    }

    return new Response(
      JSON.stringify({ processed, pending: pendingPlans.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
